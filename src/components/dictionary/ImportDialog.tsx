import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, FileSpreadsheet, Link2, Loader2, RefreshCw, Upload, X } from "lucide-react";
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
import { parseSheetsLink, fetchSheetRows } from "@/services/googleSheets";
import { importWords } from "@/services/dictionaryRepository";
import { getLanguage } from "@/lib/languages";
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

type ImportSource = "file" | "sheet";

function colName(i: number): string {
  return String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String.fromCharCode(65 + Math.floor(i / 26) - 1) : "");
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

  const [source, setSource] = useState<ImportSource>("file");
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [sheetLink, setSheetLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<FieldTarget[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  const sourceName = getLanguage(sourceLanguage)?.name ?? "Word";
  const targetName = getLanguage(targetLanguage)?.name ?? "Translation";

  const headers = useMemo<string[]>(() => {
    if (rows.length === 0) return [];
    return rows[0].map((c, i) => c.trim() || `Column ${colName(i)}`);
  }, [rows]);

  const dataRows = useMemo<SheetRow[]>(() => (hasHeader ? rows.slice(1) : rows), [rows, hasHeader]);
  const previewRows = dataRows.slice(0, 5);
  const assignedCount = mapping.filter((m) => m !== "skip").length;

  const reset = () => {
    setSource("file");
    setRows([]);
    setFileName("");
    setSheetLink("");
    setError(null);
    setResult(null);
    setHasHeader(true);
    setMapping([]);
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

  const handleHasHeaderChange = (next: boolean) => {
    setHasHeader(next);
    if (rows.length > 0) {
      const first = rows[0];
      setMapping(guessColumnMap(first ?? [], next ? rows.slice(1) : rows));
    }
  };

  const doImport = () => {
    const normalized = normalizeRows(dataRows, mapping);
    const res = importWords(dictionaryId, normalized);
    setResult(res);
    void refresh();
    loadWords(dictionaryId);
  };

  const doSheetImport = () => {
    const normalized = normalizeRows(dataRows, mapping);
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

  const doImportFinal = source === "sheet" ? doSheetImport : doImport;

  const templateContent = () => buildTemplateCsv(sourceName, targetName);
  const templateName = `${dictionaryName.toLowerCase().replace(/\s+/g, "-")}-template.csv`;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xl sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Import words
              </Dialog.Title>
              <p className="mt-1 text-sm text-muted-foreground">
                Bulk-add words to <span className="font-medium">{dictionaryName}</span>{" "}
                ({formatPair(sourceName, targetName)}).
              </p>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex gap-1 rounded-md border border-border bg-muted/40 p-1">
            <SourceTab
              active={source === "file"}
              onClick={() => setSource("file")}
              icon={<Upload className="h-3.5 w-3.5" />}
              label="Upload file"
            />
            <SourceTab
              active={source === "sheet"}
              onClick={() => setSource("sheet")}
              icon={<Link2 className="h-3.5 w-3.5" />}
              label="Google Sheets link"
            />
          </div>

          <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            {/* Format explanation, language-aware */}
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">How to format your data</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>
                  <span className="font-medium">{sourceName}</span> column — the word you want to learn.
                </li>
                <li>
                  <span className="font-medium">{targetName}</span> column — its translation.
                </li>
                <li>Optional columns: Grammar, Example, Group.</li>
                <li>Rows missing a word or translation are skipped automatically.</li>
              </ul>
              <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs" onClick={() => downloadCsv(templateName, templateContent())}>
                <Download className="h-3.5 w-3.5" /> Download template
              </Button>
            </div>

            {source === "sheet" && (
              <div className="flex flex-col gap-2">
                <Field
                  label="Public Google Sheets link"
                  htmlFor="sheet-link"
                  hint={
                    <>
                      In your sheet: <span className="font-medium">Share → Anyone with the link →
                      Viewer</span>, copy the share link, and paste it here. Nothing is sent to our
                      servers — the browser fetches the published tab directly.
                    </>
                  }
                >
                  <div className="flex gap-2">
                    <Input
                      id="sheet-link"
                      value={sheetLink}
                      onChange={(e) => setSheetLink(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/…/edit"
                    />
                    <Button variant="outline" onClick={() => void handleSheetFetch()} disabled={loading || !sheetLink.trim()}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Fetch
                    </Button>
                  </div>
                </Field>
                {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
                {error && <p className="text-sm text-destructive">{error}</p>}
                {rows.length > 0 && !result && (
                  <p className="text-xs text-muted-foreground">
                    {dataRows.length} data {dataRows.length === 1 ? "row" : "rows"} fetched.
                  </p>
                )}
              </div>
            )}

            {source === "file" && (
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/60">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Choose a .csv or .xlsx file</span>
                  <span className="text-xs text-muted-foreground">
                    The first row is usually a header; you can adjust the mapping below.
                  </span>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={(e) => void handleFile(e.target.files?.[0])}
                  />
                </label>
                {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
                {loading && <p className="text-xs text-muted-foreground">Parsing…</p>}
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
                    First row contains column headers
                  </label>
                </div>

                {assignedCount === 0 && (
                  <p className="text-sm text-destructive">
                    Assign the Word and Translation columns before importing.
                  </p>
                )}

                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        {headers.map((h, i) => (
                          <th key={i} className="px-2 py-2 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewRows.map((r, ri) => (
                        <tr key={ri}>
                          {headers.map((_h, i) => (
                            <td key={i} className="px-2 py-1.5 text-muted-foreground">
                              <CellPreview value={r[i]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                      {dataRows.length === 0 && (
                        <tr>
                          <td colSpan={headers.length} className="px-2 py-3 text-center text-xs text-muted-foreground">
                            No data rows.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <Field label="Column mapping">
                  <p className="text-xs text-muted-foreground">
                    Map each column below to a field. Unused columns can be left as “Skip”.
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
                          {FIELD_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.value === "source"
                                ? `${o.label} (${sourceName})`
                                : o.value === "target"
                                  ? `${o.label} (${targetName})`
                                  : o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {result && (
              <div className="rounded-lg border border-border p-3 text-sm">
                Imported <strong>{result.imported}</strong> word{result.imported === 1 ? "" : "s"}, skipped{" "}
                <strong>{result.skipped}</strong> duplicate{result.skipped === 1 ? "" : "s"} or invalid row
                {result.skipped === 1 ? "" : "s"}.
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline">Close</Button>
            </Dialog.Close>
            {rows.length > 0 && !result && (
              <Button onClick={doImportFinal} disabled={assignedCount === 0 || dataRows.length === 0}>
                Import words
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

function CellPreview({ value }: { value?: string }) {
  return <span className={cn(!value && "text-muted-foreground/40")}>{value ?? "—"}</span>;
}

function formatPair(source: string, target: string): string {
  return `${source} → ${target}`;
}