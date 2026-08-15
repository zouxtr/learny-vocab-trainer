import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from "sql.js";
import { drizzle, type SQLJsDatabase } from "drizzle-orm/sql-js";
import * as schema from "@/db/schema";
import migrationSql from "@/db/migrations/0000_init.sql?raw";
import sheetMigrationSql from "@/db/migrations/0001_sheet_url.sql?raw";
// Import the wasm as a Vite-managed asset so its URL, hashing and MIME type are
// handled by the bundler (works in dev and in the built PWA). Fetching the
// bytes ourselves and handing them to sql.js via `wasmBinary` avoids Emscripten's
// network streaming path entirely, which is what produced the "Response has
// unsupported MIME type" / magic-number compile errors.
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";

/**
 * Browser data layer for Lexi!.
 *
 * SQLite runs in the browser via sql.js (WebAssembly) and is persisted to the
 * Origin Private File System (OPFS) as a single `.sqlite` file. The schema and
 * migration SQL come from the Drizzle source of truth (`src/db/schema.ts` +
 * `src/db/migrations`), the same files the unit tests exercise.
 */

const DB_FILENAME = "learny.sqlite";

let SQL: SqlJsStatic | null = null;
let db: SQLJsDatabase<typeof schema> | null = null;
let rawDb: SqlJsDatabase | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
// Test hook: lets Node-based unit tests inject a ready Drizzle instance without
// exercising the browser-only init path (wasm fetch + OPFS).
let testDb: SQLJsDatabase<typeof schema> | null = null;

export interface DbHealth {
  ok: boolean;
  database_version: string;
  size_bytes: number;
  tables: string[];
}

async function loadSqlJs(): Promise<SqlJsStatic> {
  if (!SQL) {
    // Fetch the wasm bytes explicitly so we control the request (no reliance on
    // Emscripten's locateFile/instantiateStreaming path resolution).
    const res = await fetch(sqlWasmUrl);
    if (!res.ok) {
      throw new Error(`Failed to load sql.js wasm (${res.status} ${res.statusText})`);
    }
    const wasmBinary = await res.arrayBuffer();
    SQL = await initSqlJs({ wasmBinary });
  }
  return SQL;
}

/** Grab (or create) the OPFS file handle that stores the SQLite database. */
async function getDbFileHandle(): Promise<FileSystemFileHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getFileHandle(DB_FILENAME, { create: true });
}

/** Read the persisted database bytes from OPFS, or `null` when none exist. */
async function readFromOpfs(): Promise<Uint8Array | null> {
  try {
    const handle = await getDbFileHandle();
    const file = await handle.getFile();
    if (file.size === 0) return null;
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    // OPFS may be unavailable (private mode, unsupported browser) — treat as empty.
    return null;
  }
}

/** Serialize the in-memory DB back to a SQLite file in OPFS. */
export async function persistDatabase(): Promise<void> {
  if (!rawDb) return;
  const bytes = rawDb.export();
  const handle = await getDbFileHandle();
  const writable = await handle.createWritable();
  await writable.write(bytes);
  await writable.close();
}

/** Debounced persist — call after mutations so frequent writes coalesce. */
export function schedulePersist(delayMs = 400): void {
  const globalWindow = typeof window !== "undefined" ? window : undefined;
  if (persistTimer !== null && globalWindow) globalWindow.clearTimeout(persistTimer);
  persistTimer = (globalWindow ?? globalThis).setTimeout(() => {
    persistDatabase().catch((e) => console.error("Failed to persist DB", e));
  }, delayMs);
}

/**
 * Execute pending Drizzle migrations against a raw sql.js database.
 * Ordered list of [version, sql] pairs; runs each not-yet-applied migration
 * in a transaction and records the version in `_migrations`.
 */
const MIGRATIONS: { version: string; sql: string }[] = [
  { version: "0001", sql: migrationSql },
  { version: "0002", sql: sheetMigrationSql },
];

function runMigrations(raw: SqlJsDatabase): void {
  raw.run(
    "CREATE TABLE IF NOT EXISTS _migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL);",
  );

  const applied = new Set<string>(
    (raw.exec("SELECT version FROM _migrations")[0]?.values ?? []).map((r) => String(r[0])),
  );

  for (const { version, sql } of MIGRATIONS) {
    if (applied.has(version)) continue;
    // Drizzle emits one file per migration with `--> statement-breakpoint` markers.
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    raw.run("BEGIN TRANSACTION;");
    try {
      for (const statement of statements) raw.run(statement);
      raw.run("INSERT INTO _migrations (version, applied_at) VALUES (?, ?)", [
        version,
        String(Date.now()),
      ]);
      raw.run("COMMIT;");
    } catch (err) {
      raw.run("ROLLBACK;");
      throw err;
    }
    applied.add(version);
  }
}

/** Initialize (or reopen) the database. Safe to call multiple times. */
export async function initDatabase(): Promise<SQLJsDatabase<typeof schema>> {
  if (db) return db;

  const Sql = await loadSqlJs();
  const existing = await readFromOpfs();
  const raw = existing ? new Sql.Database(existing) : new Sql.Database();
  raw.run("PRAGMA foreign_keys = ON;");

  runMigrations(raw);
  rawDb = raw;
  db = drizzle(raw, { schema });
  return db;
}

/** Whether the database has been initialized in this session. */
export function isDatabaseReady(): boolean {
  return db !== null;
}

/** Typed Drizzle instance for repositories/services. Throws before init. */
export function getDatabase(): SQLJsDatabase<typeof schema> {
  if (testDb) return testDb;
  if (!db) throw new Error("Database not initialized — call initDatabase() first");
  return db;
}

/** Test-only override so repositories can run against a Node sql.js instance. */
export function setDbForTesting(drizzleDb: SQLJsDatabase<typeof schema> | null): void {
  testDb = drizzleDb;
}

/** Serialize the current in-memory database to bytes (for export/sync). */
export function dbExport(): Uint8Array {
  if (!rawDb) throw new Error("Database not initialized — call initDatabase() first");
  return rawDb.export();
}

/**
 * Replace the current in-memory database with bytes loaded from elsewhere
 * (e.g. a synced copy or an imported backup). Re-initializes the Drizzle handle
 * and persists the new state to OPFS.
 */
export async function loadDatabase(bytes: Uint8Array): Promise<void> {
  await initDatabase();
  const Sql = await loadSqlJs();
  rawDb?.close();
  const raw = new Sql.Database(bytes);
  raw.run("PRAGMA foreign_keys = ON;");
  runMigrations(raw);
  rawDb = raw;
  db = drizzle(raw, { schema });
  await persistDatabase();
}

/** Connection health, mirroring the old Rust `db_health` command. */
export async function checkDbHealth(): Promise<DbHealth> {
  await initDatabase();
  const raw = rawDb!;

  const version =
    raw.exec("SELECT sqlite_version()")[0]?.values[0]?.[0]?.toString() ?? "unknown";
  const tables = (raw.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )[0]?.values ?? []).map((r) => String(r[0]));

  let size_bytes = 0;
  try {
    const file = await (await getDbFileHandle()).getFile();
    size_bytes = file.size;
  } catch {
    size_bytes = 0;
  }

  return { ok: true, database_version: version, size_bytes, tables };
}