import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, Loader2, Plus, Search, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { MenuSelect } from "@/components/ui/MenuSelect";
import { fetchStoreEntries, type StoreEntry } from "@/services/store";
import { formatLanguagePair, getLanguage, LANGUAGES } from "@/lib/languages";
import { useT } from "@/lib/i18n";

interface StoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (entry: StoreEntry) => void;
}

export function StoreDialog({ open, onOpenChange, onAdd }: StoreDialogProps) {
  const t = useT();
  const [entries, setEntries] = useState<StoreEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [author, setAuthor] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetchStoreEntries()
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load the store."))
      .finally(() => setLoading(false));
  }, [open ]);

  const authors = useMemo(
    () => [...new Set(entries.map((e) => e.author))].sort((a, b) => a.localeCompare(b)),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (source && e.sourceLanguage !== source) return false;
      if (target && e.targetLanguage !== target) return false;
      if (author && e.author !== author) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.author.toLowerCase().includes(q) ||
        (getLanguage(e.sourceLanguage)?.name ?? "").toLowerCase().includes(q) ||
        (getLanguage(e.targetLanguage)?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, query, source, target, author]);

  const langOptions = (current: string) => [
    { value: "", label: t("All") },
    ...LANGUAGES.filter((l) => entries.some((e) => e.sourceLanguage === l.code || e.targetLanguage === l.code)).map(
      (l) => ({ value: l.code, label: l.name }),
    ),
    ...(current && !LANGUAGES.some((l) => l.code === current)
      ? [{ value: current, label: current }]
      : []),
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xl sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <Store className="h-5 w-5 text-primary" />
                {t("Dictionary store")}
              </Dialog.Title>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Browse prebuilt dictionaries shared by the community. Adding one creates it and opens the import preview.")}
              </p>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search by name, language, or author…")}
              className="pl-8"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <MenuSelect value={source} onChange={setSource} options={langOptions(source)} placeholder={t("Source language")} />
            <MenuSelect value={target} onChange={setTarget} options={langOptions(target)} placeholder={t("Target language")} />
            <MenuSelect
              value={author}
              onChange={setAuthor}
              options={[{ value: "", label: t("All authors") }, ...authors.map((a) => ({ value: a, label: a }))]}
              placeholder={t("Author")}
            />
          </div>

          <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {loading && (
              <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("Loading store…")}
              </p>
            )}
            {!loading && error && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    fetchStoreEntries()
                      .then(setEntries)
                      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load the store."))
                      .finally(() => setLoading(false));
                  }}
                >
                  {t("Try again")}
                </Button>
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  {entries.length === 0
                    ? t("The store is empty right now.")
                    : t("No dictionaries match your search.")}
                </p>
              </div>
            )}
            {!loading &&
              !error &&
              filtered.map((e) => (
                <div
                  key={`${e.name}-${e.link}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatLanguagePair(e.sourceLanguage, e.targetLanguage)} · {t("by")} {e.author}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => onAdd(e)}>
                    <Plus className="h-3.5 w-3.5" /> {t("Add")}
                  </Button>
                </div>
              ))}
          </div>

          <div className="flex items-center justify-end">
            <Dialog.Close asChild>
              <Button variant="outline">{t("Close")}</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
