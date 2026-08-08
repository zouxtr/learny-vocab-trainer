import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Data model for LearnY!.
 *
 * This is the single source of truth for the database shape. Migrations are
 * generated from this schema (drizzle-kit) and applied by the Tauri backend at
 * startup. The same schema is referenced by the test suite.
 */

/** A language code such as "de", "bg", "en". */
export const languageCode = text();

/** Row type of the `dictionaries` table. */
export type Dictionary = typeof dictionaries.$inferSelect;
/** Row type of the `words` table. */
export type Word = typeof words.$inferSelect;

/** A vocabulary dictionary. */
export const dictionaries = sqliteTable(
  "dictionaries",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    sourceLanguage: text("source_language").notNull().default("de"),
    targetLanguage: text("target_language").notNull().default("bg"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    lastOpenedAt: integer("last_opened_at", { mode: "timestamp_ms" }),
    isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    folderId: text("folder_id"),
    color: text("color"),
    /** Public Google Sheets link this dictionary was imported from (if any). */
    sheetUrl: text("sheet_url"),
    /** Field mapping (JSON array of FieldTarget) used for the stored sheet. */
    sheetColumns: text("sheet_columns", { mode: "json" }).$type<string[]>(),
  },
  (t) => [
    index("dictionaries_updated_at_idx").on(t.updatedAt),
    index("dictionaries_archived_idx").on(t.isArchived),
  ],
);

/** A single word entry inside a dictionary. */
export const words = sqliteTable(
  "words",
  {
    id: text("id").primaryKey(),
    dictionaryId: text("dictionary_id")
      .notNull()
      .references(() => dictionaries.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    target: text("target").notNull(),
    rektion: text("rektion"),
    example: text("example"),
    group: text("group"),
    notes: text("notes"),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("words_dictionary_idx").on(t.dictionaryId),
    index("words_position_idx").on(t.dictionaryId, t.position),
    uniqueIndex("words_source_dictionary_idx").on(t.dictionaryId, t.source),
  ],
);

/** The spaced-repetition state for a single word. */
export const spacedRepetition = sqliteTable(
  "spaced_repetition",
  {
    wordId: text("word_id")
      .primaryKey()
      .references(() => words.id, { onDelete: "cascade" }),
    easeFactor: real("ease_factor").notNull().default(2.5),
    interval: integer("interval").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    confidence: integer("confidence").notNull().default(0),
    nextReviewAt: integer("next_review_at", { mode: "timestamp_ms" }),
    lastReviewAt: integer("last_review_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("srs_next_review_idx").on(t.nextReviewAt)],
);

/** A single review answer made during a study session. */
export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    wordId: text("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => studySessions.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(), // flashcard | typing | multipleChoice | grammarQuiz | ...
    direction: text("direction").notNull(), // sourceToTarget | targetToSource
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    confidence: integer("confidence"), // 1-5
    responseTimeMs: integer("response_time_ms"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("reviews_word_idx").on(t.wordId), index("reviews_session_idx").on(t.sessionId)],
);

/** A completed study session. */
export const studySessions = sqliteTable(
  "study_sessions",
  {
    id: text("id").primaryKey(),
    dictionaryId: text("dictionary_id")
      .notNull()
      .references(() => dictionaries.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    wordCount: integer("word_count").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    wrongCount: integer("wrong_count").notNull().default(0),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    completedAt: integer("completed_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("sessions_dictionary_idx").on(t.dictionaryId)],
);

/** Aggregated daily activity for streaks and progress. */
export const dailyActivity = sqliteTable(
  "daily_activity",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(), // YYYY-MM-DD
    studySeconds: integer("study_seconds").notNull().default(0),
    wordsReviewed: integer("words_reviewed").notNull().default(0),
    wordsLearned: integer("words_learned").notNull().default(0),
  },
  (t) => [uniqueIndex("activity_date_idx").on(t.date)],
);