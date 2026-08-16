import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { TopBar } from "@/components/layout/TopBar";
import { HomePage } from "@/pages/HomePage";
import { DictionaryListPage } from "@/pages/DictionaryListPage";
import { DictionaryPage } from "@/pages/DictionaryPage";
import { StudyPage } from "@/pages/StudyPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { HowItWorksPage } from "@/pages/HowItWorksPage";
import { applyTheme, useUiStore } from "@/stores/uiStore";

export default function App() {
  const theme = useUiStore((s) => s.theme);

  // Re-apply the theme whenever the preference changes (and on first mount).
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <HashRouter>
      <div className="flex h-full min-h-dvh w-full overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex min-h-0 flex-1 flex-col">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dictionaries" element={<DictionaryListPage />} />
              <Route path="/dictionary/:id" element={<DictionaryPage />} />
              <Route path="/study" element={<StudyPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
            </Routes>
          </main>
          <MobileNav />
        </div>
      </div>
    </HashRouter>
  );
}