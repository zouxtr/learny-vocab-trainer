import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { DatabaseHealth } from "@/components/system/DatabaseHealth";
import { DictionaryCard } from "@/components/dictionary/DictionaryCard";
import { DictionaryFormDialog } from "@/components/dictionary/DictionaryFormDialog";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/uiStore";
import { useDictionaryStore } from "@/stores/dictionaryStore";

export function HomePage() {
  const dictionaries = useDictionaryStore((s) => s.dictionaries);
  const loaded = useDictionaryStore((s) => s.loaded);
  const refresh = useDictionaryStore((s) => s.refresh);
  const onboardingSeen = useUiStore((s) => s.onboardingSeen);
  const dismissOnboarding = useUiStore((s) => s.dismissOnboarding);

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
          <h2 className="text-2xl font-semibold tracking-tight">My dictionaries</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your vocabulary lists and get started with study sessions.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={recent.length === 0 || showOnboarding}>
          <Plus className="h-4 w-4" /> New dictionary
        </Button>
      </header>

      {showOnboarding && <OnboardingPanel onStart={() => setCreating(true)} />}

      {loaded && recent.length === 0 && !showOnboarding && (
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            You don’t have any dictionaries yet. Create one to start adding words.
          </p>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Create your first dictionary
          </Button>
        </section>
      )}

      {favorites.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">Favorites</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((d) => (
              <DictionaryCard key={d.id} dictionary={d} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">All dictionaries</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((d) => (
              <DictionaryCard key={d.id} dictionary={d} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DatabaseHealth />
      </section>

      <DictionaryFormDialog open={creating} onOpenChange={setCreating} onCreated={handleCreated} />
    </main>
  );
}