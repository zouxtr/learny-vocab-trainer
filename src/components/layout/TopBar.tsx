import { useLocation } from "react-router-dom";
import { useUiStore, applyTheme, type Theme } from "@/stores/uiStore";
import { applyDocumentLang, useT } from "@/lib/i18n";
import { LocaleSelect } from "@/components/layout/LocaleSelect";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const CYCLE: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export function TopBar() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const locale = useUiStore((s) => s.locale);
  const setLocale = useUiStore((s) => s.setLocale);
  const location = useLocation();
  const t = useT();

  const title = routeTitle(location.pathname, t);

  const cycle = () => {
    const next = CYCLE[theme];
    setTheme(next);
    applyTheme(next);
  };

  const handleLocaleChange = (next: string) => {
    setLocale(next);
    applyDocumentLang(next);
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">
        <LocaleSelect value={locale} onChange={handleLocaleChange} />
        <ThemeToggle theme={theme} onCycle={cycle} />
      </div>
    </header>
  );
}

function routeTitle(pathname: string, t: (en: string) => string): string {
  if (pathname.startsWith("/dictionary/")) return t("Dictionary");
  if (pathname === "/dictionaries") return t("Dictionaries");
  if (pathname === "/study") return t("Study");
  return t("Home");
}