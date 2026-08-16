import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { HelpContent } from "@/components/onboarding/HelpDialog";
import { useT } from "@/lib/i18n";

/** How-it-works guide as a full page instead of a modal popup. */
export function HowItWorksPage() {
  const t = useT();

  return (
    <main className="scrollbar-thin flex flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t("Back")}
        </Link>
      </div>

      <header>
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <HelpCircle className="h-5 w-5 text-primary" />
          {t("How it works")}
        </h2>
      </header>

      <div className="max-w-2xl rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <HelpContent />
      </div>
    </main>
  );
}