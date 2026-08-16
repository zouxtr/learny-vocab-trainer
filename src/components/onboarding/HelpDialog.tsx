import { Download } from "lucide-react";
import { FEATURES } from "@/lib/features";
import { useT } from "@/lib/i18n";

export function HelpContent() {
  const t = useT();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold">{t("What is Lexi!?")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("A vocabulary trainer that turns your word lists into interactive study sessions. Everything runs locally in your browser — offline, no account needed.")}
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <feature.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium">{t(feature.title)}</p>
              <p className="text-sm text-muted-foreground">{t(feature.description)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{t("How to use")}:</span>{" "}
                {t(feature.howToUse)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
        <Download className="h-3.5 w-3.5 shrink-0" />
        {t("Your data never leaves your device unless you connect cloud sync.")}
      </p>
    </div>
  );
}