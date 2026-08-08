import { describe, it, expect, beforeEach, afterEach } from "vitest";
import initSqlJs from "sql.js";
import { drizzle, type SQLJsDatabase } from "drizzle-orm/sql-js";
import path from "node:path";
import * as schema from "../src/db/schema";
import migrationSql from "../src/db/migrations/0000_init.sql?raw";
import sheetMigrationSql from "../src/db/migrations/0001_sheet_url.sql?raw";
import { setDbForTesting } from "../src/services/database";
import {
  createDictionary,
  createWord,
  listWords,
  updateDictionary,
  getDictionary,
  refreshFromSheet,
} from "../src/services/dictionaryRepository";
import { buildExportUrl, parseSheetsLink } from "../src/services/googleSheets";
import { parseTsvText } from "../src/services/importer";

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

describe("parseSheetsLink", () => {
  it("extracts the spreadsheet id from a share link", () => {
    const link = parseSheetsLink("https://docs.google.com/spreadsheets/d/abc123xyz/edit?gid=123#gid=0");
    expect(link?.spreadsheetId).toBe("abc123xyz");
    expect(link).not.toBeNull();
  });

  it("extracts the gid when present", () => {
    const link = parseSheetsLink("https://docs.google.com/spreadsheets/d/abc123xyz/edit#gid=42");
    expect(link?.gid).toBe("42");
  });

  it("rejects non-Sheets urls", () => {
    expect(parseSheetsLink("https://example.com/not-a-sheet")).toBeNull();
    expect(parseSheetsLink("")).toBeNull();
  });

  it("builds a tsv export url with optional gid", () => {
    const base = buildExportUrl({ spreadsheetId: "abc", raw: "x" });
    expect(base).toBe("https://docs.google.com/spreadsheets/d/abc/export?format=tsv");
    const withGid = buildExportUrl({ spreadsheetId: "abc", gid: "7", raw: "x" });
    expect(withGid).toBe("https://docs.google.com/spreadsheets/d/abc/export?format=tsv&gid=7");
  });
});

describe("parseTsvText", () => {
  it("parses tab-separated rows", async () => {
    const rows = await parseTsvText("das Haus\thouse\n\nder Hund\t\tdog");
    expect(rows).toEqual([
      ["das Haus", "house"],
      ["der Hund", "", "dog"],
    ]);
  });

  it("drops blank lines", async () => {
    const rows = await parseTsvText("a\tb\n\nc\td\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("refreshFromSheet", () => {
  beforeEach(async () => {
    setDbForTesting(await makeDb());
  });
  afterEach(() => setDbForTesting(null));

  it("adds new, updates existing by source, keeps missing words by default", () => {
    const dict = createDictionary({ name: "A", sourceLanguage: "en", targetLanguage: "es" });
    createWord({ dictionaryId: dict.id, source: "casa", target: "house" }); // will be updated
    createWord({ dictionaryId: dict.id, source: "obsolete", target: "old" }); // missing in sheet

    const result = refreshFromSheet(dict.id, [
      { source: "casa", target: "home", grammar: "f." },
      { source: "perro", target: "dog" },
      { source: "casa", target: "dup" }, // duplicate → skipped
      { source: "", target: "x" }, // invalid
    ]);

    expect(result).toMatchObject({ added: 1, updated: 1, removed: 0, absent: 1, skipped: 2 });

    const words = listWords(dict.id);
    const casa = words.find((w) => w.source === "casa");
    expect(casa?.target).toBe("home");
    expect(casa?.rektion).toBe("f.");
    expect(words).toHaveLength(3); // casa, perro, obsolete kept
  });

  it("removes missing words when applyRemovals is true", () => {
    const dict = createDictionary({ name: "A", sourceLanguage: "en", targetLanguage: "es" });
    createWord({ dictionaryId: dict.id, source: "gone", target: "x" });

    refreshFromSheet(dict.id, [{ source: "stays", target: "y" }], { applyRemovals: true });

    expect(listWords(dict.id).map((w) => w.source)).toEqual(["stays"]);
  });

  it("does not mutate notes or SRS fields on update", () => {
    const dict = createDictionary({ name: "A", sourceLanguage: "en", targetLanguage: "es" });
    const w = createWord({ dictionaryId: dict.id, source: "casa", target: "house", notes: "keep me" });

    refreshFromSheet(dict.id, [{ source: "casa", target: "home" }]);

    expect(listWords(dict.id)[0].notes).toBe("keep me");
    expect(listWords(dict.id).find((x) => x.id === w.id)?.target).toBe("home");
  });

  it("reorders words to match the sheet when reorder is enabled", () => {
    const dict = createDictionary({ name: "A", sourceLanguage: "en", targetLanguage: "es" });
    createWord({ dictionaryId: dict.id, source: "first", target: "1" });
    createWord({ dictionaryId: dict.id, source: "second", target: "2" });

    refreshFromSheet(dict.id, [
      { source: "second", target: "2" },
      { source: "first", target: "1" },
    ]);

    const order = listWords(dict.id).map((w) => w.source);
    expect(order).toEqual(["second", "first"]);
  });

  it("can store sheet metadata on a dictionary via updateDictionary", () => {
    const dict = createDictionary({ name: "A", sourceLanguage: "en", targetLanguage: "es" });
    updateDictionary(dict.id, {
      sheetUrl: "https://docs.google.com/spreadsheets/d/abc",
      sheetColumns: ["source", "target"],
    });
    const updated = getDictionary(dict.id);
    expect(updated?.sheetUrl).toBe("https://docs.google.com/spreadsheets/d/abc");
    expect(updated?.sheetColumns).toEqual(["source", "target"]);
  });
});