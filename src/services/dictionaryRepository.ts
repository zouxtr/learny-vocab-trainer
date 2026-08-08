import { sql, desc, type SQL } from "drizzle-orm";
import { eq, and } from "drizzle-orm";
import { getDatabase, schedulePersist } from "@/services/database";
import { dictionaries, spacedRepetition, words, type Dictionary, type Word } from "@/db/schema";

export interface NewDictionary {
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  color?: string | null;
}

export interface UpdateDictionaryFields {
  name?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  color?: string | null;
  tags?: string[];
  sheetUrl?: string | null;
  sheetColumns?: string[] | null;
}

export interface NewWord {
  dictionaryId: string;
  source: string;
  target: string;
  rektion?: string | null;
  example?: string | null;
  group?: string | null;
  notes?: string | null;
}

export interface UpdateWordFields {
  source?: string;
  target?: string;
  rektion?: string | null;
  example?: string | null;
  group?: string | null;
  notes?: string | null;
}

function nowDate(): Date {
  return new Date();
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** Create a new dictionary with an explicit source/target language pair. */
export function createDictionary(input: NewDictionary): Dictionary {
  const db = getDatabase();
  const id = uid("dict");
  const row = {
    id,
    name: input.name.trim(),
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    isFavorite: false,
    isArchived: false,
    tags: [],
    color: input.color ?? null,
  };
  db.insert(dictionaries).values(row).run();
  schedulePersist();
  return getDictionary(id) as Dictionary;
}

/** List a user's dictionaries, optionally restricting to a visibility scope. */
export function listDictionaries(opts?: { includeArchived?: boolean }): Dictionary[] {
  const db = getDatabase();
  const conditions: SQL[] = [eq(dictionaries.isArchived, false)];
  if (opts?.includeArchived) conditions.pop();
  const rows = db
    .select()
    .from(dictionaries)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(dictionaries.updatedAt))
    .all();
  return rows as Dictionary[];
}

/** Fetch a single dictionary by id, or `null` when missing. */
export function getDictionary(id: string): Dictionary | null {
  const db = getDatabase();
  const row = db.select().from(dictionaries).where(eq(dictionaries.id, id)).get();
  return (row as Dictionary) ?? null;
}

/** Update editable fields on a dictionary and bump its `updated_at`. */
export function updateDictionary(id: string, fields: UpdateDictionaryFields): Dictionary | null {
  const db = getDatabase();
  const patch: Record<string, unknown> = { updatedAt: nowDate() };
  if (fields.name !== undefined) patch.name = fields.name.trim();
  if (fields.sourceLanguage !== undefined) patch.sourceLanguage = fields.sourceLanguage;
  if (fields.targetLanguage !== undefined) patch.targetLanguage = fields.targetLanguage;
  if (fields.isFavorite !== undefined) patch.isFavorite = fields.isFavorite;
  if (fields.isArchived !== undefined) patch.isArchived = fields.isArchived;
  if (fields.color !== undefined) patch.color = fields.color;
  if (fields.tags !== undefined) patch.tags = fields.tags;
  if (fields.sheetUrl !== undefined) patch.sheetUrl = fields.sheetUrl;
  if (fields.sheetColumns !== undefined) patch.sheetColumns = fields.sheetColumns;

  db.update(dictionaries).set(patch).where(eq(dictionaries.id, id)).run();
  schedulePersist();
  return getDictionary(id);
}

/** Permanently delete a dictionary and its words (cascade). */
export function deleteDictionary(id: string): void {
  getDatabase().delete(dictionaries).where(eq(dictionaries.id, id)).run();
  schedulePersist();
}

/** Toggle the favorite flag without touching other fields. */
export function toggleFavorite(id: string): void {
  const current = getDictionary(id);
  if (!current) return;
  updateDictionary(id, { isFavorite: !current.isFavorite });
}

/** List all words belonging to a dictionary, ordered by position. */
export function listWords(dictionaryId: string): Word[] {
  const db = getDatabase();
  const rows = db
    .select()
    .from(words)
    .where(eq(words.dictionaryId, dictionaryId))
    .orderBy(words.position)
    .all();
  return rows as Word[];
}

export function getWord(id: string): Word | null {
  const db = getDatabase();
  const row = db.select().from(words).where(eq(words.id, id)).get();
  return (row as Word) ?? null;
}

/** A word row joined with its review stats (for "most missed" sorting). */
export interface WordWithStats extends Word {
  lapses: number;
}

/** List a dictionary's words with their SRS lapse counts, ordered by position. */
export function listWordsWithStats(dictionaryId: string): WordWithStats[] {
  const db = getDatabase();
  const rows = db
    .select()
    .from(words)
    .leftJoin(spacedRepetition, eq(words.id, spacedRepetition.wordId))
    .where(eq(words.dictionaryId, dictionaryId))
    .orderBy(words.position)
    .all();
  return rows.map((r) => ({ ...r.words, lapses: r.spaced_repetition?.lapses ?? 0 })) as WordWithStats[];
}

/** Append a word to a dictionary at the end of its list. */
export function createWord(input: NewWord): Word {
  const db = getDatabase();
  const id = uid("word");
  const positionQuery = db
    .select({ m: sql<number>`MAX(${words.position})` })
    .from(words)
    .where(eq(words.dictionaryId, input.dictionaryId))
    .get();
  const position = (positionQuery?.m ?? -1) + 1;

  const row = {
    id,
    dictionaryId: input.dictionaryId,
    source: input.source.trim(),
    target: input.target.trim(),
    rektion: input.rektion ?? null,
    example: input.example ?? null,
    group: input.group ?? null,
    notes: input.notes ?? null,
    position,
  };
  db.insert(words).values(row).run();
  schedulePersist();
  return row as Word;
}

export function updateWord(id: string, fields: UpdateWordFields): Word | null {
  const db = getDatabase();
  const patch: Record<string, unknown> = { updatedAt: nowDate() };
  if (fields.source !== undefined) patch.source = fields.source.trim();
  if (fields.target !== undefined) patch.target = fields.target.trim();
  if (fields.rektion !== undefined) patch.rektion = fields.rektion;
  if (fields.example !== undefined) patch.example = fields.example;
  if (fields.group !== undefined) patch.group = fields.group;
  if (fields.notes !== undefined) patch.notes = fields.notes;

  db.update(words).set(patch).where(eq(words.id, id)).run();
  schedulePersist();
  const row = getWord(id);
  return row;
}

/** Delete a single word and its cascade (SRS state, reviews). */
export function deleteWord(id: string): void {
  getDatabase().delete(words).where(eq(words.id, id)).run();
  schedulePersist();
}

export interface ImportWord {
  source: string;
  target: string;
  grammar?: string;
  example?: string;
  group?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

/**
 * Bulk-add words from an imported list, skipping rows without source/target
 * and rows whose source already exists in the dictionary (unique constraint).
 */
export function importWords(dictionaryId: string, input: ImportWord[]): ImportResult {
  const existing = new Set(listWords(dictionaryId).map((w) => w.source.toLowerCase()));
  let imported = 0;
  let skipped = 0;

  for (const item of input) {
    const source = item.source.trim();
    const target = item.target.trim();
    if (!source || !target) {
      skipped += 1;
      continue;
    }
    const key = source.toLowerCase();
    if (existing.has(key)) {
      skipped += 1;
      continue;
    }
    createWord({
      dictionaryId,
      source,
      target,
      rektion: item.grammar || null,
      example: item.example || null,
      group: item.group || null,
    });
    existing.add(key);
    imported += 1;
  }

  return { imported, skipped };
}

/** Count words in a dictionary (used for dashboard cards). */
export function countWords(dictionaryId: string): number {
  const db = getDatabase();
  const row = db
    .select({ c: sql<number>`COUNT(*)` })
    .from(words)
    .where(eq(words.dictionaryId, dictionaryId))
    .get();
  return row?.c ?? 0;
}

export interface SheetSyncResult {
  added: number;
  updated: number;
  removed: number;
  /** Rows present locally but missing from the sheet (not deleted when opt-out). */
  absent: number;
  skipped: number;
}

/**
 * Resync a sheet-backed dictionary against its latest source rows.
 *
 * Matching identity is the normalized `source` (same rule the unique index
 * `words_source_dictionary_idx` uses). The sheet is treated as the authority
 * for word content: existing words are updated in place (their `notes` and SRS
 * state are preserved), new rows are inserted, and rows absent from the sheet
 * can be removed so the dictionary mirrors it. Duplicate sources within the
 * sheet collapse to the first occurrence; rows missing content count as
 * `skipped`. Removal is opt-in so local edits / learned state are never
 * silently discarded.
 */
export function refreshFromSheet(
  dictionaryId: string,
  input: ImportWord[],
  opts: {
    /** Order the rows land in by overwriting `position`. Defaults to true. */
    reorder?: boolean;
    /** Whether rows absent from the sheet should be deleted. Defaults to false. */
    applyRemovals?: boolean;
  } = {},
): SheetSyncResult {
  const { reorder = true, applyRemovals = false } = opts;

  const current = listWords(dictionaryId);
  const bySource = new Map(current.map((w) => [w.source.toLowerCase(), w]));

  const seen = new Set<string>();
  const validRows: ImportWord[] = [];
  let skipped = 0;

  for (const item of input) {
    const source = item.source.trim();
    const target = item.target.trim();
    if (!source || !target) {
      skipped += 1;
      continue;
    }
    const key = source.toLowerCase();
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    validRows.push(item);
  }

  let added = 0;
  let updated = 0;
  const touched = new Set<string>();

  validRows.forEach((item, index) => {
    const source = item.source.trim();
    const key = source.toLowerCase();
    const existing = bySource.get(key);

    if (existing) {
      updateWord(existing.id, {
        target: item.target.trim(),
        rektion: item.grammar || null,
        example: item.example || null,
        group: item.group || null,
      });
      if (reorder && existing.position !== index) {
        dbPatchWordPosition(existing.id, index);
      }
      updated += 1;
    } else {
      const row = createWord({
        dictionaryId,
        source,
        target: item.target.trim(),
        rektion: item.grammar || null,
        example: item.example || null,
        group: item.group || null,
      });
      if (reorder && row.position !== index) dbPatchWordPosition(row.id, index);
      added += 1;
    }
    touched.add(key);
  });

  let removed = 0;
  const absent: string[] = [];
  for (const w of current) {
    if (touched.has(w.source.toLowerCase())) continue;
    absent.push(w.source);
    if (applyRemovals) {
      deleteWord(w.id);
      removed += 1;
    }
  }

  return { added, updated, removed, absent: absent.length, skipped };
}

/** Directly patch a word's `position` without bumping content fields. */
function dbPatchWordPosition(id: string, position: number): void {
  getDatabase()
    .update(words)
    .set({ position })
    .where(eq(words.id, id))
    .run();
  schedulePersist();
}