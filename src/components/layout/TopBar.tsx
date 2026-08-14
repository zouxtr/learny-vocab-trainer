import { useState } from "react";
import { useLocation } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { CloudUpload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore, applyTheme, type Theme } from "@/stores/uiStore";
import { applyDocumentLang, useT } from "@/lib/i18n";
import { LocaleSelect } from "@/components/layout/LocaleSelect";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SyncSection } from "@/components/system/SyncSection";

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
  const [syncOpen, setSyncOpen] = useState(false);

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
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          aria-label={t("Cloud sync")}
          title={t("Cloud sync")}
          onClick={() => setSyncOpen(true)}
        >
          <CloudUpload className="h-4 w-4" />
        </Button>
        <LocaleSelect value={locale} onChange={handleLocaleChange} />
        <ThemeToggle theme={theme} onCycle={cycle} />
      </div>

      <Dialog.Root open={syncOpen} onOpenChange={setSyncOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <CloudUpload className="h-5 w-5 text-primary" />
                {t("Cloud sync")}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            <div className="mt-4">
              <SyncSection />
            </div>
            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild>
                <Button>{t("Close")}</Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}

function routeTitle(pathname: string, t: (en: string) => string): string {
  if (pathname.startsWith("/dictionary/")) return t("Dictionary");
  if (pathname === "/dictionaries") return t("Dictionaries");
  if (pathname === "/study") return t("Study");
  return t("Home");
}