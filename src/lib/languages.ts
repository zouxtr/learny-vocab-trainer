/**
 * ISO 639-1 language codes used for dictionary source/target language pairs.
 * This is the single place language codes are mapped to human-readable names.
 */
export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
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
];

/** Look up a language by code, falling back to a readable placeholder. */
export function getLanguage(code: string | null | undefined): Language | undefined {
  if (!code) return undefined;
  return LANGUAGES.find((l) => l.code === code);
}

/** Render a language pair as a readable string, e.g. "English → Spanish". */
export function formatLanguagePair(source: string, target: string): string {
  const from = getLanguage(source);
  const to = getLanguage(target);
  return `${from?.name ?? source} → ${to?.name ?? target}`;
}