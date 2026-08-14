import { cn } from "@/lib/utils";
import { translate } from "@/lib/i18n";

export function ThemeToggle({
  theme,
  onCycle,
  className,
}: {
  theme: "light" | "dark" | "system";
  onCycle: () => void;
  className?: string;
}) {
  const labels: Record<"light" | "dark" | "system", string> = {
    light: translate("Light mode"),
    dark: translate("Dark mode"),
    system: translate("System theme"),
  };
  return (
    <button
      type="button"
      onClick={onCycle}
      title={labels[theme]}
      aria-label={labels[theme]}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      {theme === "dark" ? "☾" : theme === "light" ? "☀" : "◐"}
    </button>
  );
}