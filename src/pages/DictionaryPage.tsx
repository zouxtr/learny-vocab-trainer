import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { MenuSelect } from "@/components/ui/MenuSelect";
import { DictionaryFormDialog } from "@/components/dictionary/DictionaryFormDialog";
import { WordFormDialog } from "@/components/dictionary/WordFormDialog";
import { ImportDialog } from "@/components/dictionary/ImportDialog";
import { formatLanguagePair } from "@/lib/languages";
import { useDictionaryStore } from "@/stores/dictionaryStore";
import { guessColumnMap, normalizeRows, type FieldTarget } from "@/services/importer";
import { parseSheetsLink, fetchSheetRows } from "@/services/googleSheets";
import { refreshFromSheet, type WordWithStats } from "@/services/dictionaryRepository";
import type { Word } from "@/db/schema";
import { cn } from "@/lib/utils";

type WordSort = "position" | "dateAdded" | "sourceAlpha" | "targetAlpha" | "mostMissed";

const WORD_SORTS: { value: WordSort; label: string; hint?: string }[] = [
  { value: "position", label: "In order" },
  { value: "dateAdded", label: "Newest first" },
  { value: "sourceAlpha", label: "Word (A–Z)" },
  { value: "targetAlpha", label: "Translation (A–Z)" },
  { value: "mostMissed", label: "Most missed" },
];

/** Stable ordering of the words shown in the dictionary list. */
function sortWords(words: WordWithStats[], sort: WordSort): WordWithStats[] {
  const copy = [...words];
  copy.sort((a, b) => {
    if (sort === "sourceAlpha") {
      const cmp = a.source.localeCompare(b.source);
      return cmp !== 0 ? cmp : a.position - b.position;
    }
    if (sort === "targetAlpha") {
      const cmp = a.target.localeCompare(b.target);
      return cmp !== 0 ? cmp : a.position - b.position;
    }
    if (sort === "dateAdded") {
      const cmp = a.createdAt.getTime() - b.createdAt.getTime();
      return cmp !== 0 ? cmp : a.position - b.position;
    }
    if (sort === "mostMissed") {
      if (a.lapses !== b.lapses) return b.lapses - a.lapses;
      return a.position - b.position;
    }
    return a.position - b.position;
  });
  return copy;
}

export function DictionaryPage() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dictionaries = useDictionaryStore((s) => s.dictionaries);
  const words = useDictionaryStore((s) => s.words);
  const refresh = useDictionaryStore((s) => s.refresh);
  const open = useDictionaryStore((s) => s.open);
  const loadWords = useDictionaryStore((s) => s.loadWords);
  const removeWord = useDictionaryStore((s) => s.removeWord);
  const remove = useDictionaryStore((s) => s.remove);

  const [creatingWord, setCreatingWord] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingDict, setEditingDict] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<WordSort>("position");

  const dictionary = dictionaries.find((d) => d.id === id);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (id) open(id);
  }, [id, open]);

  // "Add word" shortcuts on the dashboard cards deep-link here with `?add=1`;
  // open the add dialog once and clear the flag.
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setCreatingWord(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (!dictionary) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">Dictionary not found.</p>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </Button>
      </main>
    );
  }

  const handleDeleteDict = () => {
    if (confirmingDelete) {
      remove(dictionary.id);
      window.location.hash = "#/";
    } else {
      setConfirmingDelete(true);
      window.setTimeout(() => setConfirmingDelete(false), 3000);
    }
  };

  const hasSheetSource = Boolean(dictionary.sheetUrl);

  /** Re-fetch the stored public sheet and apply the saved column mapping. */
  const handleRefreshSheet = async () => {
    if (!dictionary.sheetUrl) return;
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const link = parseSheetsLink(dictionary.sheetUrl);
      if (!link) {
        setRefreshResult("The stored link no longer looks like a Google Sheets link.");
        return;
      }
      const rows = await fetchSheetRows(link);
      const columns = dictionary.sheetColumns ?? [];
      const map = (columns.length > 0
        ? columns
        : guessColumnMap(rows[0] ?? [], rows.slice(1))) as FieldTarget[];
      const normalized = normalizeRows(rows.slice(1), map);
      const sync = refreshFromSheet(dictionary.id, normalized);
      void refresh();
      loadWords(dictionary.id);

      const removals =
        sync.absent > 0
          ? ` (${sync.absent} ${sync.absent === 1 ? "word" : "words"} in the dictionary but not in the sheet were kept)`
          : "";
      setRefreshResult(
        `Sheet synced: ${sync.added} added, ${sync.updated} updated, ${sync.removed} removed, ${sync.skipped} skipped.${removals}`,
      );
    } catch (e) {
      setRefreshResult(e instanceof Error ? e.message : "Failed to refresh the sheet.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <main className="scrollbar-thin flex flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
      </div>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight">{dictionary.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatLanguagePair(dictionary.sourceLanguage, dictionary.targetLanguage)} ·{" "}
              {words.length} {words.length === 1 ? "word" : "words"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasSheetSource && (
              <Button variant="outline" size="sm" onClick={() => void handleRefreshSheet()} disabled={refreshing}>
                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {refreshing ? "Refreshing…" : "Refresh"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditingDict(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteDict}
              aria-label="Delete dictionary"
            >
              <Trash2 className="h-3.5 w-3.5" /> {confirmingDelete ? "Confirm?" : "Delete"}
            </Button>
          </div>
        </div>
      </header>

      {refreshResult && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <p className="flex items-start gap-2">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{refreshResult}</span>
          </p>
          <button type="button" onClick={() => setRefreshResult(null)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">Words</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button onClick={() => setCreatingWord(true)}>
            <Plus className="h-4 w-4" /> Add word
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search words or translations…"
            className="pl-8"
          />
        </div>
        <div className="sm:w-52">
          <MenuSelect<WordSort>
            value={sort}
            onChange={setSort}
            options={WORD_SORTS}
            placeholder="Sort"
          />
        </div>
      </div>

      {words.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No words yet. Add your first word to start building this dictionary.
          </p>
          <Button onClick={() => setCreatingWord(true)}>
            <Plus className="h-4 w-4" /> Add your first word
          </Button>
        </section>
      ) : (
        <WordList
          words={words}
          query={query}
          sort={sort}
          onEdit={(word) => setEditingWord(word)}
          onDelete={(word) => removeWord(word.id)}
        />
      )}

      <WordFormDialog
        dictionaryId={dictionary.id}
        sourceLanguage={dictionary.sourceLanguage}
        targetLanguage={dictionary.targetLanguage}
        open={creatingWord}
        onOpenChange={setCreatingWord}
      />
      <WordFormDialog
        dictionaryId={dictionary.id}
        sourceLanguage={dictionary.sourceLanguage}
        targetLanguage={dictionary.targetLanguage}
        word={editingWord}
        open={editingWord !== null}
        onOpenChange={(o) => !o && setEditingWord(null)}
      />
      <DictionaryFormDialog
        dictionary={dictionary}
        open={editingDict}
        onOpenChange={setEditingDict}
      />
      <ImportDialog
        dictionaryId={dictionary.id}
        dictionaryName={dictionary.name}
        sourceLanguage={dictionary.sourceLanguage}
        targetLanguage={dictionary.targetLanguage}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </main>
  );
}

interface WordListProps {
  words: WordWithStats[];
  query: string;
  sort: WordSort;
  onEdit: (word: Word) => void;
  onDelete: (word: Word) => void;
}

function WordList({ words, query, sort, onEdit, onDelete }: WordListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const matches = trimmed
      ? words.filter(
          (w) =>
            w.source.toLowerCase().includes(trimmed) ||
            w.target.toLowerCase().includes(trimmed) ||
            (w.rektion ?? "").toLowerCase().includes(trimmed),
        )
      : words;
    return sortWords(matches, sort);
  }, [words, query, sort]);

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  if (filtered.length === 0) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No words match your search.
        </p>
      </section>
    );
  }

  return (
    <div ref={parentRef} className="max-h-[60vh] overflow-auto rounded-xl border border-border">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="border-b border-border px-4 py-2 font-medium">Word</th>
            <th className="border-b border-border px-4 py-2 font-medium">Translation</th>
            <th className="hidden border-b border-border px-4 py-2 font-medium sm:table-cell">Grammar</th>
            <th className="border-b border-border px-4 py-2" />
          </tr>
        </thead>
        <tbody style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((vi) => (
            <WordRow
              key={filtered[vi.index].id}
              word={filtered[vi.index]}
              onEdit={onEdit}
              onDelete={onDelete}
              style={{
                height: vi.size,
                transform: `translateY(${vi.start}px)`,
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface WordRowProps {
  word: Word;
  onEdit: (word: Word) => void;
  onDelete: (word: Word) => void;
  style?: React.CSSProperties;
}

function WordRow({ word, onEdit, onDelete, style }: WordRowProps) {
  const [confirming, setConfirming] = useState(false);

  const handleDelete = () => {
    if (confirming) onDelete(word);
    else {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <tr
      style={{ position: "absolute", top: 0, left: 0, width: "100%", ...style }}
      className="group transition-colors hover:bg-muted/40"
    >
      <td className="px-4 py-3 font-medium break-words">{word.source}</td>
      <td className={cn("px-4 py-3 break-words", !word.target && "text-muted-foreground")}>{word.target}</td>
      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
        {word.rektion ?? <span className="text-muted-foreground/50">—</span>}
      </td>
      <td className="w-16 px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Edit word"
            onClick={() => onEdit(word)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            aria-label="Delete word"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}