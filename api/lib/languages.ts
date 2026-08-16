/**
 * ISO 639-1 language codes → human-readable names, for the serverless function.
 *
 * Vercel packages only the `api/` directory into the function, so files under
 * `src/` are NOT available at runtime. This module lives inside `api/` on
 * purpose and mirrors `src/lib/languages.ts` — keep the two lists in sync when
 * languages are added or renamed.
 */

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  bg: "Bulgarian",
  de: "German",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  zh: "Chinese",
  ru: "Russian",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  sv: "Swedish",
  ar: "Arabic",
};

/** Full name for a language code, falling back to the raw code when unknown. */
export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}