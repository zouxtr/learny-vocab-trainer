import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Download,
  FileSpreadsheet,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  buildTemplateCsv,
  downloadCsv,
  guessColumnMap,
  normalizeRows,
  parseSheet,
  FIELD_OPTIONS,
  type FieldTarget,
  type SheetRow,
} from "@/services/importer";
import { parseSheetsLink, fetchSheetRows, fetchTsvUrl } from "@/services/googleSheets";
import { importWords } from "@/services/dictionaryRepository";
import { generateWords, getDeviceId, AiGenerationError } from "@/services/aiGenerator";
import { getLanguage } from "@/lib/languages";
import { useT } from "@/lib/i18n";
import { useDictionaryStore } from "@/stores/dictionaryStore";
import { cn } from "@/lib/utils";

interface ImportDialogProps {
  dictionaryId: string;
  dictionaryName: string;
  sourceLanguage: string;
  targetLanguage: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportResult {
  imported: number;
  skipped: number;
}

type ImportSource = "file" | "sheet" | "tsv" | "ai";

const MAX_AI_COUNT = 25;

function colName(i: number): string {
  return String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String.fromCharCode(65 + Math.floor(i / 26) - 1) : "");
}

function clampCount(n: number): number {
  if (!Number.isFinite(n)) return 10;
  return Math.min(MAX_AI_COUNT, Math.max(1, Math.floor(n)));
}

export function ImportDialog({
  dictionaryId,
  dictionaryName,
  sourceLanguage,
  targetLanguage,
  open,
  onOpenChange,
}: ImportDialogProps) {
  const refresh = useDictionaryStore((s) => s.refresh);
  const loadWords = useDictionaryStore((s) => s.loadWords);
  const update = useDictionaryStore((s) => s.update);
  const t = useT();

  const [source, setSource] = useState<ImportSource>("file");
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [sheetLink, setSheetLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<FieldTarget[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [aiDescription, setAiDescription] = useState("");
  const [aiCount, setAiCount] = useState(10);
  /** Per-row cell overrides keyed by data-row index (inline editing). */
  const [editedRows, setEditedRows] = useState<Record<number, string[]>>({});
  /** Data-row indices excluded before commit. */
  const [deselected, setDeselected] = useState<Set<number>>(new Set());

  const sourceName = getLanguage(sourceLanguage)?.name ?? "Word";
  const targetName = getLanguage(targetLanguage)?.name ?? "Translation";

  const headers = useMemo<string[]>(() => {
    if (rows.length === 0) return [];
    return rows[0].map((c, i) => c.trim() || `Column ${colName(i)}`);
  }, [rows]);

  const dataRows = useMemo<SheetRow[]>(() => (hasHeader ? rows.slice(1) : rows), [rows, hasHeader]);
  const previewLimit = source === "ai" ? dataRows.length : 5;
  const assignedCount = mapping.filter((m) => m !== "skip").length;
  const selectedCount = dataRows.length - deselected.size;

  const reset = () => {
    setSource("file");
    setRows([]);
    setFileName("");
    setSheetLink("");
    setError(null);
    setResult(null);
    setHasHeader(true);
    setMapping([]);
    setAiDescription("");
    setAiCount(10);
    setEditedRows({});
    setDeselected(new Set());
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setResult(null);
    setFileName(file.name);
    setLoading(true);
    try {
      const parsed = await parseSheet(file);
      setRows(parsed);
      setMapping(guessColumnMap(parsed[0] ?? [], parsed.slice(1)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse the file.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSheetFetch = async () => {
    setError(null);
    setResult(null);
    const parsed = parseSheetsLink(sheetLink);
    if (!parsed) {
      setError("That doesn’t look like a public Google Sheets link. Paste the share link from your sheet.");
      return;
    }
    setLoading(true);
    try {
      const fetched = await fetchSheetRows(parsed);
      setRows(fetched);
      setMapping(guessColumnMap(fetched[0] ?? [], fetched.slice(1)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch the sheet.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTsvFetch = async () => {
    setError(null);
    setResult(null);
    if (!sheetLink.trim()) {
      setError("Paste a link to a TSV file first.");
      return;
    }
    setLoading(true);
    try {
      const fetched = await fetchTsvUrl(sheetLink);
      setRows(fetched);
      setMapping(guessColumnMap(fetched[0] ?? [], fetched.slice(1)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch the TSV file.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const aiErrorText = (e: unknown): string => {
    if (e instanceof AiGenerationError) {
      if (e.code === "limit") return t("You've reached today's free generation limit. Try again tomorrow.");
      if (e.code === "generation") return t("The AI couldn't produce a valid list. Please try again.");
      if (e.code === "provider") return t("AI generation is not configured on the server.");
      return t("AI generation failed. Please try again.");
    }
    return e instanceof Error ? e.message : t("AI generation failed. Please try again.");
  };

  const handleAiGenerate = async () => {
    setError(null);
    setResult(null);
    if (!aiDescription.trim()) {
      setError(t("Describe the words you want first."));
      return;
    }
    setLoading(true);
    try {
      const res = await generateWords({
        sourceLanguage,
        targetLanguage,
        description: aiDescription.trim(),
        count: clampCount(aiCount),
        deviceId: getDeviceId(),
      });
      const header: SheetRow = [sourceName, targetName, t("Grammar"), t("Example"), t("Group")];
      const body: SheetRow[] = res.words.map((w) => [w.source, w.target, w.grammar ?? "", w.example ?? ""]);
      setRows([header, ...body]);
      setMapping(["source", "target", "grammar", "example", "skip"]);
      setHasHeader(true);
      setEditedRows({});
      setDeselected(new Set());
    } catch (e) {
      setError(aiErrorText(e));
    } finally {
      setLoading(false);
    }
  };

  const handleHasHeaderChange = (next: boolean) => {
    setHasHeader(next);
    if (rows.length > 0) {
      const first = rows[0];
      setMapping(guessColumnMap(first ?? [], next ? rows.slice(1) : rows));
    }
  };

  const commitRows = useMemo<SheetRow[]>(
    () =>
      dataRows
        .map((row, ri) => (editedRows[ri] ? [...editedRows[ri]] : row))
        .filter((_row, ri) => !deselected.has(ri)),
    [dataRows, editedRows, deselected],
  );

  const doImport = () => {
    const normalized = normalizeRows(commitRows, mapping);
    const res = importWords(dictionaryId, normalized);
    setResult(res);
    void refresh();
    loadWords(dictionaryId);
  };

  const doSheetImport = () => {
    const normalized = normalizeRows(commitRows, mapping);
    const res = importWords(dictionaryId, normalized);
    setResult(res);
    // Remember the source link + column mapping so the page can offer Refresh.
    update(dictionaryId, {
      sheetUrl: sheetLink.trim(),
      sheetColumns: mapping.map((m) => m),
    });
    void refresh();
    loadWords(dictionaryId);
  };

  const doImportFinal = source === "file" || source === "ai" ? doImport : doSheetImport;

  const templateContent = () => buildTemplateCsv(sourceName, targetName);
  const templateName = `${dictionaryName.toLowerCase().replace(/\s+/g, "-")}-template.csv`;

  const updateCell = (row: number, col: number, value: string) => {
    setEditedRows((prev) => {
      const base = dataRows[row] ?? [];
      const cur = [...(prev[row] ? [...prev[row]] : base)];
      while (cur.length <= col) cur.push("");
      cur[col] = value;
      return { ...prev, [row]: cur };
    });
  };

  const toggleDeselected = (row: number) => {
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xl sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                {t("Import words")}
              </Dialog.Title>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Bulk-add words to {name} ({pair}).", { name: dictionaryName, pair: formatPair(sourceName, targetName) })}
              </p>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex flex-wrap gap-1 rounded-md border border-border bg-muted/40 p-1">
            <SourceTab
              active={source === "file"}
              onClick={() => setSource("file")}
              icon={<Upload className="h-3.5 w-3.5" />}
              label={t("Upload file")}
            />
            <SourceTab
              active={source === "sheet"}
              onClick={() => setSource("sheet")}
              icon={<Link2 className="h-3.5 w-3.5" />}
              label={t("Google Sheets")}
            />
            <SourceTab
              active={source === "tsv"}
              onClick={() => setSource("tsv")}
              icon={<Link2 className="h-3.5 w-3.5" />}
              label={t("TSV link")}
            />
            <SourceTab
              active={source === "ai"}
              onClick={() => setSource("ai")}
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label={t("Generate with AI")}
            />
          </div>

          <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            {source !== "ai" && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{t("How to format your data")}</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>
                    <span className="font-medium">{sourceName}</span> {t("is the column for the word you want to learn.")}
                  </li>
                  <li>
                    <span className="font-medium">{targetName}</span> {t("is the column for its translation.")}
                  </li>
                  <li>{t("Optional columns: Grammar, Example, Group.")}</li>
                  <li>{t("Rows missing a word or translation are skipped automatically.")}</li>
                </ul>
                <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs" onClick={() => downloadCsv(templateName, templateContent())}>
                  <Download className="h-3.5 w-3.5" /> {t("Download template")}
                </Button>
              </div>
            )}

            {source === "ai" && (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  {t("Describe the words you want and we'll generate a draft list with the AI. You review, edit and deselect rows before importing — nothing is saved until you click Import words.")}
                </div>
                <Field
                  label={t("What should the words be about?")}
                  htmlFor="ai-description"
                  hint={t("For example: restaurant phrases, household items, verbs of movement…")}
                >
                  <Input
                    id="ai-description"
                    value={aiDescription}
                    onChange={(e) => setAiDescription(e.target.value)}
                    placeholder={t("Describe the topic…")}
                    disabled={loading}
                  />
                </Field>
                <Field label={t("Number of words")} htmlFor="ai-count" hint={t("Between 1 and {max}", { max: MAX_AI_COUNT })}>
                  <Input
                    id="ai-count"
                    type="number"
                    min={1}
                    max={MAX_AI_COUNT}
                    value={aiCount}
                    onChange={(e) => setAiCount(clampCount(Number(e.target.value)))}
                    className="w-32"
                    disabled={loading}
                  />
                </Field>
                <div className="flex items-center gap-2">
                  <Button onClick={() => void handleAiGenerate()} disabled={loading || !aiDescription.trim()}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {loading ? t("Generating…") : t("Generate")}
                  </Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {rows.length > 0 && !result && (
                  <p className="text-xs text-muted-foreground">
                    {dataRows.length} {dataRows.length === 1 ? t("word generated.") : t("words generated.")}{" "}
                    {t("Review them below before importing.")}
                  </p>
                )}
              </div>
            )}

            {source !== "file" && source !== "ai" && (
              <div className="flex flex-col gap-2">
                <Field
                  label={source === "sheet" ? t("Public Google Sheets link") : t("Public TSV file link")}
                  htmlFor="sheet-link"
                  hint={
                    source === "sheet" ? (
                      <>
                        {t("In your sheet:")} <span className="font-medium">{t("Share → Anyone with the link → Viewer")}</span>,{" "}
                        {t("copy the share link and paste it here. Nothing is sent to our servers — the browser fetches the published tab directly.")}
                      </>
                    ) : (
                      <>
                        {t("Paste a direct link to a tab-separated text file (for example a")}{" "}
                        <span className="font-medium">{t("Raw")}</span>{" "}
                        {t("GitHub link or any public URL serving TSV). The browser fetches it directly — nothing is sent to our servers.")}
                      </>
                    )
                  }
                >
                  <div className="flex gap-2">
                    <Input
                      id="sheet-link"
                      value={sheetLink}
                      onChange={(e) => setSheetLink(e.target.value)}
                      placeholder={
                        source === "sheet"
                          ? "https://docs.google.com/spreadsheets/d/…/edit"
                          : "https://example.com/words.tsv"
                      }
                    />
                    <Button
                      variant="outline"
                      onClick={() => void (source === "sheet" ? handleSheetFetch() : handleTsvFetch())}
                      disabled={loading || !sheetLink.trim()}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {t("Fetch")}
                    </Button>
                  </div>
                </Field>
                {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
                {error && <p className="text-sm text-destructive">{error}</p>}
                {rows.length > 0 && !result && (
                  <p className="text-xs text-muted-foreground">
                    {dataRows.length} {dataRows.length === 1 ? t("data row") : t("data rows")} {t("fetched.")}
                  </p>
                )}
              </div>
            )}

            {source === "file" && (
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/60">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("Choose a .csv or .xlsx file")}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("The first row is usually a header; you can adjust the mapping below.")}
                  </span>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={(e) => void handleFile(e.target.files?.[0])}
                  />
                </label>
                {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
                {loading && <p className="text-xs text-muted-foreground">{t("Parsing…")}</p>}
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            )}

            {rows.length > 0 && !result && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <input
                    id="has-header"
                    type="checkbox"
                    checked={hasHeader}
                    onChange={(e) => handleHasHeaderChange(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="has-header" className="text-sm text-muted-foreground">
                    {t("First row contains column headers")}
                  </label>
                </div>

                {assignedCount === 0 && (
                  <p className="text-sm text-destructive">
                    {t("Assign the Word and Translation columns before importing.")}
                  </p>
                )}

                {deselected.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("{n} of {m} rows selected", { n: selectedCount, m: dataRows.length })}
                  </p>
                )}

                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="w-10 px-2 py-2 font-medium" aria-label={t("Include")}>
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={deselected.size === 0 && dataRows.length > 0}
                            onChange={(e) =>
                              setDeselected(e.target.checked ? new Set() : new Set(dataRows.map((_r, i) => i)))
                            }
                            aria-label={t("Select all rows")}
                          />
                        </th>
                        {headers.map((h, i) => (
                          <th key={i} className="px-2 py-2 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dataRows.slice(0, previewLimit).map((r, dataIndex) => {
                        const values = editedRows[dataIndex] ?? r;
                        const excluded = deselected.has(dataIndex);
                        return (
                          <tr key={dataIndex} className={cn(excluded && "opacity-40")}>
                            <td className="px-2 py-1.5">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={!excluded}
                                onChange={() => toggleDeselected(dataIndex)}
                                aria-label={t("Include row {n}", { n: dataIndex + 1 })}
                              />
                            </td>
                            {headers.map((_h, i) => (
                              <td key={i} className="px-2 py-1.5">
                                <input
                                  value={values[i] ?? ""}
                                  onChange={(e) => updateCell(dataIndex, i, e.target.value)}
                                  disabled={excluded}
                                  className="h-7 w-full min-w-24 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                      {dataRows.length === 0 && (
                        <tr>
                          <td colSpan={headers.length + 1} className="px-2 py-3 text-center text-xs text-muted-foreground">
                            {t("No data rows.")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <Field label={t("Column mapping")}>
                  <p className="text-xs text-muted-foreground">
                    {t("Map each column below to a field. Unused columns can be left as “Skip”.")}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {headers.map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">{h}</span>
                        <select
                          value={mapping[i] ?? "skip"}
                          onChange={(e) => {
                            const next = [...mapping];
                            next[i] = e.target.value as FieldTarget;
                            setMapping(next);
                          }}
                          className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {FIELD_OPTIONS.map((o) => {
                            const label =
                              o.value === "source"
                                ? t("Word")
                                : o.value === "target"
                                  ? t("Translation")
                                  : o.value === "grammar"
                                    ? t("Grammar")
                                    : o.value === "example"
                                      ? t("Example")
                                      : o.value === "group"
                                        ? t("Group")
                                        : t("Skip column");
                            const display =
                              o.value === "source"
                                ? `${label} (${sourceName})`
                                : o.value === "target"
                                  ? `${label} (${targetName})`
                                  : label;
                            return (
                              <option key={o.value} value={o.value}>
                                {display}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {result && (
              <div className="rounded-lg border border-border p-3 text-sm">
                {t("Imported {n} words, skipped {m} duplicates or invalid rows.", {
                  n: result.imported,
                  m: result.skipped,
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline">{t("Close")}</Button>
            </Dialog.Close>
            {rows.length > 0 && !result && (
              <Button onClick={doImportFinal} disabled={assignedCount === 0 || selectedCount === 0}>
                {t("Import words")}
                {selectedCount > 0 && dataRows.length > 1 ? ` (${selectedCount})` : ""}
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SourceTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function formatPair(source: string, target: string): string {
  return `${source} → ${target}`;
}