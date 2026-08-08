import { describe, it, expect, beforeEach, afterEach } from "vitest";
import initSqlJs from "sql.js";
import { drizzle, type SQLJsDatabase } from "drizzle-orm/sql-js";
import path from "node:path";
import * as schema from "../src/db/schema";
import migrationSql from "../src/db/migrations/0000_init.sql?raw";
import sheetMigrationSql from "../src/db/migrations/0001_sheet_url.sql?raw";
import { setDbForTesting } from "../src/services/database";
import { createDictionary, listDictionaries, getDictionary, updateDictionary, deleteDictionary, getWord, listWords, listWordsWithStats, createWord, updateWord, deleteWord, countWords } from "../src/services/dictionaryRepository";

async function makeDb(): Promise<SQLJsDatabase<typeof schema>> {
  const Sql = await initSqlJs({
    locateFile: (f) => path.join(process.cwd(), "node_modules/sql.js/dist", f),
  });
  const raw = new Sql.Database();
  raw.run("PRAGMA foreign_keys = ON;");
  raw.exec(migrationSql.replace(/--> statement-breakpoint/g, ";"));
  raw.exec(sheetMigrationSql.replace(/--> statement-breakpoint/g, ";"));
  return drizzle(raw, { schema });
}

describe("dictionaryRepository", () => {
  beforeEach(async () => {
    const db = await makeDb();
    setDbForTesting(db);
  });

  afterEach(() => {
    setDbForTesting(null);
  });

  it("creates a dictionary with an explicit language pair", () => {
    const dict = createDictionary({ name: "Spanish for travel", sourceLanguage: "en", targetLanguage: "es" });
    expect(dict.name).toBe("Spanish for travel");
    expect(dict.sourceLanguage).toBe("en");
    expect(dict.targetLanguage).toBe("es");

    const listed = listDictionaries();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(dict.id);
  });

  it("does not apply the legacy German defaults when languages are provided", () => {
    const dict = createDictionary({ name: "Travel", sourceLanguage: "en", targetLanguage: "es" });
    const fetched = getDictionary(dict.id)!;
    expect(fetched.sourceLanguage).not.toBe("de");
    expect(fetched.targetLanguage).not.toBe("bg");
    expect(fetched.sourceLanguage).toBe("en");
  });

  it("updates fields and bumps the updated timestamp", () => {
    const dict = createDictionary({ name: "A", sourceLanguage: "en", targetLanguage: "es" });
    const before = getDictionary(dict.id)!.updatedAt;
    const updated = updateDictionary(dict.id, { name: "B", isFavorite: true });
    expect(updated!.name).toBe("B");
    expect(updated!.isFavorite).toBe(true);
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("cascades words when a dictionary is deleted", () => {
    const dict = createDictionary({ name: "A", sourceLanguage: "en", targetLanguage: "es" });
    createWord({ dictionaryId: dict.id, source: "hola", target: "hello" });
    expect(countWords(dict.id)).toBe(1);

    deleteDictionary(dict.id);
    expect(getDictionary(dict.id)).toBeNull();
    expect(listWords(dict.id)).toEqual([]);
  });

  it("adds, edits and deletes words", () => {
    const dict = createDictionary({ name: "A", sourceLanguage: "en", targetLanguage: "es" });

    const w1 = createWord({ dictionaryId: dict.id, source: "casa", target: "house" });
    const w2 = createWord({ dictionaryId: dict.id, source: "perro", target: "dog", group: "Animals" });

    const words = listWords(dict.id);
    expect(words).toHaveLength(2);
    expect(words[0].source).toBe("casa");

    const edited = updateWord(w1.id, { target: "home", rektion: "feminine noun" });
    expect(edited!.target).toBe("home");
    expect(edited!.rektion).toBe("feminine noun");

    expect(getWord(w2.id)!.group).toBe("Animals");

    deleteWord(w1.id);
    const remaining = listWords(dict.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(w2.id);
    expect(countWords(dict.id)).toBe(1);
  });

  it("orders words by insertion position", () => {
    const dict = createDictionary({ name: "A", sourceLanguage: "en", targetLanguage: "es" });
    createWord({ dictionaryId: dict.id, source: "one", target: "uno" });
    createWord({ dictionaryId: dict.id, source: "two", target: "dos" });
    createWord({ dictionaryId: dict.id, source: "three", target: "tres" });
    expect(listWords(dict.id).map((w) => w.source)).toEqual(["one", "two", "three"]);
  });

  it("joins lapse counts for the dictionary word list", () => {
    const dict = createDictionary({ name: "A", sourceLanguage: "en", targetLanguage: "es" });
    const w1 = createWord({ dictionaryId: dict.id, source: "casa", target: "house" });
    createWord({ dictionaryId: dict.id, source: "perro", target: "dog" });

    // A never-reviewed word has zero lapses.
    expect(listWordsWithStats(dict.id).find((w) => w.id === w1.id)?.lapses).toBe(0);
    expect(listWordsWithStats(dict.id)).toHaveLength(2);
  });
});