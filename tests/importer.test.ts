import { describe, it, expect, beforeEach, afterEach } from "vitest";
import initSqlJs from "sql.js";
import { drizzle, type SQLJsDatabase } from "drizzle-orm/sql-js";
import path from "node:path";
import * as schema from "../src/db/schema";
import migrationSql from "../src/db/migrations/0000_init.sql?raw";
import sheetMigrationSql from "../src/db/migrations/0001_sheet_url.sql?raw";
import { setDbForTesting } from "../src/services/database";
import { createDictionary, createWord, listWords, importWords } from "../src/services/dictionaryRepository";
import {
  guessColumnMap,
  normalizeRows,
  buildTemplateCsv,
  type SheetRow,
} from "../src/services/importer";

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

describe("import column mapping", () => {
  it("maps headers like Word + Translation to source/target", () => {
    const headers = ["Word", "Translation"];
    const map = guessColumnMap(headers, [["casa", "house"]]);
    expect(map).toEqual(["source", "target"]);
  });

  it("recognizes friendly header names and skips extras", () => {
    const headers = ["source", "target", "grammar", "group", "note"];
    const map = guessColumnMap(headers, [["one", "uno", "noun", "numbers", "x"]]);
    expect(map).toEqual(["source", "target", "grammar", "group", "skip"]);
  });

  it("falls back to positional A/B mapping for bare files", () => {
    const headers = ["", ""];
    const map = guessColumnMap(headers, [["hola", "hello"]]);
    expect(map).toEqual(["source", "target"]);
  });

  it("does not assign one field to multiple columns", () => {
    const headers = ["Word", "English", "Translation"];
    const map = guessColumnMap(headers, [["a", "b", "c"]]);
    expect(map).toEqual(["source", "skip", "target"]);
  });
});

describe("normalizeRows", () => {
  it("builds word rows from the mapped columns", () => {
    const rows: SheetRow[] = [
      ["casa", "house", "la casa", "La casa es grande.", "Home"],
    ];
    const map = ["source", "target", "grammar", "example", "group"];
    const out = normalizeRows(rows, map);
    expect(out).toEqual([
      { source: "casa", target: "house", grammar: "la casa", example: "La casa es grande.", group: "Home" },
    ]);
  });

  it("leaves missing cells empty and skips unmapped columns", () => {
    const rows: SheetRow[] = [["perro", "", "dog"]];
    const out = normalizeRows(rows, ["source", "example", "target"]);
    expect(out).toEqual([
      { source: "perro", target: "dog", grammar: "", example: "", group: "" },
    ]);
  });
});

describe("importWords persistence", () => {
  beforeEach(async () => {
    setDbForTesting(await makeDb());
  });
  afterEach(() => setDbForTesting(null));

  it("imports new rows and skips duplicates + invalid rows", () => {
    const dict = createDictionary({ name: "A", sourceLanguage: "en", targetLanguage: "es" });
    createWord({ dictionaryId: dict.id, source: "casa", target: "house" });

    const result = importWords(dict.id, [
      { source: "casa", target: "home" }, // duplicate source
      { source: "", target: "x" }, // missing source
      { source: "perro", target: "dog", grammar: "m." },
      { source: "gato", target: "" }, // missing target
    ]);

    expect(result).toEqual({ imported: 1, skipped: 3 });
    expect(listWords(dict.id)).toHaveLength(2);
    expect(listWords(dict.id).find((w) => w.source === "perro")?.rektion).toBe("m.");
  });
});

describe("buildTemplateCsv", () => {
  it("uses language-specific column labels", () => {
    const csv = buildTemplateCsv("English", "Japanese");
    expect(csv.split("\n")[0]).toBe("English,Japanese,Grammar,Example,Group");
  });

  it("escapes commas and quotes inside cells", () => {
    const csv = buildTemplateCsv("English", "Spanish", [['hello, world', 'he said "hi"']]);
    expect(csv).toContain('"hello, world"');
    expect(csv).toContain('"he said ""hi"""');
  });
});