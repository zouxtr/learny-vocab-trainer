import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Normalize the drizzle migration SQL and apply it to an in-memory DB. */
function applyMigration(...sqls: string[]): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  for (const sql of sqls) {
    const normalized = sql.replace(/--> statement-breakpoint/g, ";");
    db.exec(normalized);
  }
  return db;
}

const migrationSql = readFileSync(
  path.join(process.cwd(), "src/db/migrations/0000_init.sql"),
  "utf-8",
);

const sheetMigrationSql = readFileSync(
  path.join(process.cwd(), "src/db/migrations/0001_sheet_url.sql"),
  "utf-8",
);

describe("database schema (0000_init migration)", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = applyMigration(migrationSql);
  });

  afterEach(() => {
    db.close();
  });

  it("creates all six tables", () => {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as Array<{ name: string }>;

    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        "daily_activity",
        "dictionaries",
        "reviews",
        "spaced_repetition",
        "study_sessions",
        "words",
      ]),
    );
  });

  it("enforces foreign key cascade on words -> dictionaries", () => {
    const dictId = "dict-1";
    db.prepare(
      "INSERT INTO dictionaries (id, name) VALUES (?, ?)",
    ).run(dictId, "Test");
    db.prepare(
      "INSERT INTO words (id, dictionary_id, source, target, position) VALUES (?, ?, ?, ?, ?)",
    ).run("word-1", dictId, "das Haus", "house", 0);

    db.prepare("DELETE FROM dictionaries WHERE id = ?").run(dictId);

    const remaining = db.prepare("SELECT COUNT(*) AS c FROM words").get() as { c: number };
    expect(remaining.c).toBe(0);
  });

  it("rejects duplicate (dictionary_id, source) word pairs", () => {
    db.prepare("INSERT INTO dictionaries (id, name) VALUES (?, ?)").run("d1", "Test");
    db.prepare(
      "INSERT INTO words (id, dictionary_id, source, target, position) VALUES (?, ?, ?, ?, ?)",
    ).run("w1", "d1", "der Tisch", "table", 0);
    expect(() =>
      db
        .prepare(
          "INSERT INTO words (id, dictionary_id, source, target, position) VALUES (?, ?, ?, ?, ?)",
        )
        .run("w2", "d1", "der Tisch", "table", 1),
    ).toThrow();
  });

  it("applies sensible defaults", () => {
    db.prepare("INSERT INTO dictionaries (id, name) VALUES (?, ?)").run("d1", "Test");
    const row = db.prepare("SELECT * FROM dictionaries WHERE id = ?").get("d1") as Record<
      string,
      unknown
    >;
    expect(row.source_language).toBe("de");
    expect(row.target_language).toBe("bg");
    expect(row.is_favorite).toBe(0);
    expect(row.tags).toBe("[]");
  });

  it("0001 migration adds sheet_url and sheet_columns columns", () => {
    const migrated = applyMigration(migrationSql, sheetMigrationSql);
    const cols = migrated
      .prepare("PRAGMA table_info(dictionaries)")
      .all() as Array<{ name: string }>;
    expect(cols.map((c) => c.name)).toEqual(
      expect.arrayContaining(["sheet_url", "sheet_columns"]),
    );
    migrated.close();
  });
});