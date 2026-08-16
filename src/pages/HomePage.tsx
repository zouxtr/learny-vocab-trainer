import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Plus } from "lucide-react";
import { DictionaryCard } from "@/components/dictionary/DictionaryCard";
import { DictionaryFormDialog } from "@/components/dictionary/DictionaryFormDialog";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/uiStore";
import { useDictionaryStore } from "@/stores/dictionaryStore";
import { useT } from "@/lib/i18n";

export function HomePage() {
  const dictionaries = useDictionaryStore((s) => s.dictionaries);
  const loaded = useDictionaryStore((s) => s.loaded);
  const refresh = useDictionaryStore((s) => s.refresh);
  const onboardingSeen = useUiStore((s) => s.onboardingSeen);
  const dismissOnboarding = useUiStore((s) => s.dismissOnboarding);
  const t = useT();

  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const favorites = dictionaries.filter((d) => d.isFavorite);
  const recent = dictionaries;
  const showOnboarding = loaded && !onboardingSeen && recent.length === 0;

  const handleCreated = (id: string) => {
    dismissOnboarding();
    navigate(`/dictionary/${id}`);
  };

  return (
    <main className="scrollbar-thin flex flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("My dictionaries")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Manage your vocabulary lists and get started with study sessions.")}
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={recent.length === 0 || showOnboarding}>
          <Plus className="h-4 w-4" /> {t("New dictionary")}
        </Button>
      </header>

      <section className="max-w-2xl rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            {t("Lexi! is a study companion for language students — build dictionaries of the words you’re learning and revise them with flashcards until they stick.")}
            {" "}
            <Link to="/how-it-works" className="font-medium text-primary hover:underline">
              {t("See how it works")}
            </Link>
          </span>
        </p>
      </section>

      {showOnboarding && <OnboardingPanel onStart={() => setCreating(true)} />}

      {loaded && recent.length === 0 && !showOnboarding && (
        <EmptyState onCreate={() => setCreating(true)} />
      )}

      {favorites.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">{t("Favorites")}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((d) => (
              <DictionaryCard key={d.id} dictionary={d} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">{t("All dictionaries")}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((d) => (
              <DictionaryCard key={d.id} dictionary={d} />
            ))}
          </div>
        </section>
      )}

      <DictionaryFormDialog open={creating} onOpenChange={setCreating} onCreated={handleCreated} />
    </main>
  );
}

/** First-dictionary call to action. Rendered as a faux dictionary entry so the
 * empty Home still feels like a language product, not a generic dashboard. */
function EmptyState({ onCreate }: { onCreate: () => void }) {
  const t = useT();

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
      <div className="w-full rounded-xl border border-border/70 bg-muted/40 p-5 text-left">
        <p className="font-heading text-3xl font-semibold tracking-tight">{t("your vocabulary")}</p>
        <div className="mt-3 flex items-baseline gap-2 text-sm">
          <span className="font-heading font-medium text-primary">example ·</span>
          <span className="text-muted-foreground">Beispiel</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2 text-sm">
          <span className="font-heading font-medium text-primary">house ·</span>
          <span className="text-muted-foreground">das Haus</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2 text-sm">
          <span className="font-heading font-medium text-primary">learn ·</span>
          <span className="text-muted-foreground">lernen</span>
        </div>
      </div>

      <h3 className="mt-6 text-xl font-semibold tracking-tight">{t("Your vocabulary starts here.")}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("Create your first dictionary — a word list between two languages — and add words as you go.")}
      </p>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" /> {t("Create your first dictionary")}
        </Button>
        <Link
          to="/how-it-works"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {t("How it works")}
        </Link>
      </div>
    </section>
  );
}