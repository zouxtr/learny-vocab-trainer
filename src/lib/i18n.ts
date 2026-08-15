/**
 * Lightweight UI localization for Lexi!.
 *
 * English is the source language; translations are looked up by their English
 * key. Unknown keys and unlisted locales fall back to English so the app
 * always renders something sensible.
 */

import { useUiStore } from "@/stores/uiStore";
import type { Language } from "@/lib/languages";

export type Locale = string;

/** Map of English string -> localized string for every supported UI locale. */
export interface LocaleDict {
  [en: string]: string;
}

export const UI_LOCALES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "bg", name: "Bulgarian", nativeName: "Български" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
] as const;

export function getUiLocale(code: string | null | undefined): Language | undefined {
  if (!code) return undefined;
  return UI_LOCALES.find((l) => l.code === code) as unknown as Language | undefined;
}

/** Translation tables keyed by the active locale code. */
const DICTIONARIES: Record<string, LocaleDict> = {};

/**
 * Register a dictionary for a locale (called from the generated locale file).
 */
export function registerDictionary(locale: string, dict: LocaleDict): void {
  DICTIONARIES[locale] = dict;
}

/** Return the active locale code (persisted in the UI store). */
export function useActiveLocale(): Locale {
  return useUiStore((s) => s.locale);
}

/** Translate an English string into the active locale, falling back to English. */
export function translate(en: string, locale?: Locale, vars?: Record<string, string | number>): string {
  if (!locale) locale = useUiStore.getState().locale;
  let out = locale === "en" ? en : (DICTIONARIES[locale]?.[en] ?? en);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(String(v));
    }
  }
  return out;
}

/** React hook returning a translate function bound to the active locale. */
export function useT(): (en: string, vars?: Record<string, string | number>) => string {
  const locale = useActiveLocale();
  return (en: string, vars?: Record<string, string | number>) => translate(en, locale, vars);
}

/** Set the <html lang> attribute to match the active locale. */
export function applyDocumentLang(locale: Locale = "en"): void {
  document.documentElement.lang = locale;
}