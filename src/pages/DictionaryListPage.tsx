import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Store } from "lucide-react";
import { DictionaryCard } from "@/components/dictionary/DictionaryCard";
import { DictionaryFormDialog } from "@/components/dictionary/DictionaryFormDialog";
import { ImportDialog } from "@/components/dictionary/ImportDialog";
import { StoreDialog } from "@/components/dictionary/StoreDialog";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useDictionaryStore } from "@/stores/dictionaryStore";
import type { StoreEntry } from "@/services/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Filter = "all" | "favorites";

interface StoreSeed {
  dictionaryId: string;
  source: "sheet" | "tsv";
  link: string;
}

export function DictionaryListPage() {
  const dictionaries = useDictionaryStore((s) => s.dictionaries);
  const refresh = useDictionaryStore((s) => s.refresh);
  const create = useDictionaryStore((s) => s.create);
  const t = useT();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeSeed, setStoreSeed] = useState<StoreSeed | null>(null);

  /** Add a store entry: create the dictionary, then open import prefetched. */
  const handleStoreAdd = (entry: StoreEntry) => {
    const created = create({
      name: entry.name,
      sourceLanguage: entry.sourceLanguage,
      targetLanguage: entry.targetLanguage,
    });
    if (!created) return;
    setStoreOpen(false);
    setStoreSeed({ dictionaryId: created.id, source: entry.linkType, link: entry.link });
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dictionaries.filter((d) => {
      if (filter === "favorites" && !d.isFavorite) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.sourceLanguage.toLowerCase().includes(q) ||
        d.targetLanguage.toLowerCase().includes(q)
      );
    });
  }, [dictionaries, query, filter]);

  return (
    <main className="scrollbar-thin flex flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("Dictionaries")} <span className="rounded bg-primary px-1.5 py-0.5 align-middle text-xs text-primary-foreground">TEST-BANNER-OK</span></h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Search, favorite and organize your vocabulary lists.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setStoreOpen(true)}>
            <Store className="h-4 w-4" /> {t("Store")}
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> {t("New dictionary")}
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("Search by name or language…")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-card p-1">
          {(["all", "favorites"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? t("All") : t("★ Favorites")}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {dictionaries.length === 0
              ? t("No dictionaries yet. Create one to get started.")
              : t("No dictionaries match your search.")}
          </p>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <DictionaryCard key={d.id} dictionary={d} />
          ))}
        </section>
      )}

      <DictionaryFormDialog open={creating} onOpenChange={setCreating} />
      <StoreDialog open={storeOpen} onOpenChange={setStoreOpen} onAdd={handleStoreAdd} />
      {storeSeed && (
        <ImportDialog
          dictionaryId={storeSeed.dictionaryId}
          dictionaryName={dictionaries.find((d) => d.id === storeSeed.dictionaryId)?.name ?? ""}
          sourceLanguage={dictionaries.find((d) => d.id === storeSeed.dictionaryId)?.sourceLanguage ?? "en"}
          targetLanguage={dictionaries.find((d) => d.id === storeSeed.dictionaryId)?.targetLanguage ?? "de"}
          open={storeSeed !== null}
          onOpenChange={(o) => !o && setStoreSeed(null)}
          initialSource={storeSeed.source}
          initialSheetLink={storeSeed.link}
          autoFetch
        />
      )}
    </main>
  );
}