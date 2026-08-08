import { useLocation } from "react-router-dom";
import { useUiStore, applyTheme, type Theme } from "@/stores/uiStore";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const CYCLE: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export function TopBar() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const location = useLocation();

  const title = routeTitle(location.pathname);

  const cycle = () => {
    const next = CYCLE[theme];
    setTheme(next);
    applyTheme(next);
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">
        <ThemeToggle theme={theme} onCycle={cycle} />
      </div>
    </header>
  );
}

function routeTitle(pathname: string): string {
  if (pathname.startsWith("/dictionary/")) return "Dictionary";
  if (pathname === "/dictionaries") return "Dictionaries";
  if (pathname === "/study") return "Study";
  return "Home";
}