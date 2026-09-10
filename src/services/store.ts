import { LANGUAGES } from "@/lib/languages";

/** One prebuilt dictionary listed in the community store file. */
export interface StoreEntry {
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  link: string;
  /** "sheet" = public Google Sheets link, "tsv" = direct TSV file link. */
  linkType: "sheet" | "tsv";
  author: string;
}

const VALID_CODES = new Set(LANGUAGES.map((l) => l.code));

/** Raw store file served by GitHub (CORS-enabled, fetchable from the browser). */
export const STORE_FILE_URL =
  "https://raw.githubusercontent.com/zouxtr/learny-vocab-trainer/main/store/dictionaries.txt";

/**
 * Split one store line into fields. Commas inside double quotes don't split;
 * `""` inside a quoted field is a literal `"`. Surrounding whitespace and
 * outer quotes are stripped.
 */
export function splitStoreLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      fields.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

/** Parse one store line into an entry, or `null` when the line is invalid. */
export function parseStoreLine(line: string): StoreEntry | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const fields = splitStoreLine(trimmed);
  if (fields.length !== 6) return null;
  const [name, source, target, link, type, author] = fields;
  const sourceLanguage = source.toLowerCase();
  const targetLanguage = target.toLowerCase();
  const linkType = type.toLowerCase();
  if (!name || !link || !author) return null;
  if (!VALID_CODES.has(sourceLanguage) || !VALID_CODES.has(targetLanguage)) return null;
  if (sourceLanguage === targetLanguage) return null;
  if (linkType !== "sheet" && linkType !== "tsv") return null;
  return { name, sourceLanguage, targetLanguage, link, linkType, author };
}

/** Parse the whole store file, skipping comments, blanks, and invalid lines. */
export function parseStoreText(text: string): StoreEntry[] {
  const entries: StoreEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const entry = parseStoreLine(line);
    if (entry) entries.push(entry);
  }
  return entries;
}

let cache: StoreEntry[] | null = null;

/** Fetch + parse the store file (cached for the page lifetime). */
export async function fetchStoreEntries(): Promise<StoreEntry[]> {
  if (cache) return cache;
  const res = await fetch(STORE_FILE_URL);
  if (!res.ok) {
    throw new Error(`Could not load the dictionary store (HTTP ${res.status}). Check your connection and try again.`);
  }
  cache = parseStoreText(await res.text());
  return cache;
}

/** Test hook: clear the fetch cache. */
export function clearStoreCache(): void {
  cache = null;
}
