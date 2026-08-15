import { Button } from "@/components/ui/button";
import { HelpContent } from "@/components/onboarding/HelpDialog";
import { useT } from "@/lib/i18n";
import { useUiStore } from "@/stores/uiStore";

interface OnboardingPanelProps {
  onStart: () => void;
}

/** First-run welcome card shown before the user has any dictionaries. */
export function OnboardingPanel({ onStart }: OnboardingPanelProps) {
  const dismiss = useUiStore((s) => s.dismissOnboarding);
  const t = useT();

  return (
    <section className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">{t("Welcome to Lexi!")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("Build your vocabulary dictionaries and turn them into study sessions. Here’s how it works.")}
      </p>
      <div className="mt-5">
        <HelpContent />
      </div>
      <div className="mt-6 flex items-center gap-2">
        <Button onClick={onStart}>{t("Create your first dictionary")}</Button>
        <Button variant="ghost" onClick={dismiss}>
          {t("I’ll explore first")}
        </Button>
      </div>
    </section>
  );
}