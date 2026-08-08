import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
  onboardingSeen: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  dismissOnboarding: () => void;
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return prefersDark() ? "dark" : "light";
  }
  return theme;
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

let mediaQuery: MediaQueryList | null = null;

/** Apply the active theme to the document root for Tailwind's `dark:` variant. */
export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");

  // In "system" mode, keep following the OS preference live (and on change).
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  if (theme === "system") {
    if (mediaQuery !== mql) {
      mediaQuery?.removeEventListener("change", onSystemThemeChange);
      mediaQuery = mql;
      mediaQuery.addEventListener("change", onSystemThemeChange);
    }
  } else if (mediaQuery) {
    mediaQuery.removeEventListener("change", onSystemThemeChange);
    mediaQuery = null;
  }
}

/** Re-resolve whenever the OS preference flips while in "system" mode. */
function onSystemThemeChange() {
  applyTheme(useUiStore.getState().theme);
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "system",
      sidebarCollapsed: false,
      onboardingSeen: false,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      dismissOnboarding: () => set({ onboardingSeen: true }),
    }),
    { name: "learny-ui" },
  ),
);