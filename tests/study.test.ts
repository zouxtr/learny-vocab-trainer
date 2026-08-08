import { describe, it, expect, beforeEach, afterEach } from "vitest";
import initSqlJs from "sql.js";
import { drizzle, type SQLJsDatabase } from "drizzle-orm/sql-js";
import { eq } from "drizzle-orm";
import path from "node:path";
import * as schema from "../src/db/schema";
import { studySessions } from "../src/db/schema";
import migrationSql from "../src/db/migrations/0000_init.sql?raw";
import sheetMigrationSql from "../src/db/migrations/0001_sheet_url.sql?raw";
import { getDatabase, setDbForTesting } from "../src/services/database";
import { createDictionary, createWord } from "../src/services/dictionaryRepository";
import {
  startSession,
  finishSession,
  recordReview,
  listDueRows,
  listStudyRows,
} from "../src/services/studyRepository";
import {
  computeReview,
  defaultSrs,
  isCorrect,
  isDue,
  pickDueOrder,
  questionFor,
  formatWord,
  acceptTypedAnswer,
  answersMatch,
  buildDistractors,
  normalizeAnswer,
  type StudyWord,
} from "../src/services/study";

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

const DAY = 24 * 60 * 60 * 1000;

describe("SM-2 style scheduler", () => {
  it("walks a fresh card through the interval ladder on good reviews", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    let srs = computeReview(null, 3, now);

    expect(srs.repetitions).toBe(1);
    expect(srs.interval).toBe(1);
    expect(srs.easeFactor).toBeCloseTo(2.6, 5); // 2.5 + 0.1
    expect(srs.nextReviewAt!.getTime()).toBeCloseTo(now.getTime() + DAY, -2);

    srs = computeReview(srs, 3, srs.nextReviewAt!);
    expect(srs.repetitions).toBe(2);
    expect(srs.interval).toBe(6);
    expect(srs.easeFactor).toBeCloseTo(2.7, 5);

    srs = computeReview(srs, 3, srs.nextReviewAt!);
    expect(srs.repetitions).toBe(3);
    // ease after three good: 2.5 → 2.6 → 2.7 → 2.8
    expect(srs.easeFactor).toBeCloseTo(2.8, 5);
    expect(srs.interval).toBe(Math.round(6 * 2.8)); // geometric growth
  });

  it("resets repetition stage on a failed grade and grows lapses", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const progressed = computeReview(null, 3, now); // ease 2.6
    progressed.repetitions = 3;
    progressed.interval = 15;

    const after = computeReview(progressed, 1, now);
    expect(after.repetitions).toBe(0);
    expect(after.lapses).toBe(1);
    expect(after.interval).toBe(1);
    expect(after.easeFactor).toBeCloseTo(2.4, 5); // 2.6 − 0.2
  });

  it("never drops the ease factor below the floor", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    let srs = defaultSrs();
    srs.easeFactor = 1.3;
    for (let i = 0; i < 5; i++) srs = computeReview(srs, 1, now);
    expect(srs.easeFactor).toBe(1.3);
  });

  it("classifies grades as correct only at 3+", () => {
    expect(isCorrect(1)).toBe(false);
    expect(isCorrect(2)).toBe(false);
    expect(isCorrect(3)).toBe(true);
    expect(isCorrect(5)).toBe(true);
  });

  it("flags due cards and orders scheduled reviews first, new cards last", () => {    const now = new Date("2026-01-01T12:00:00Z");
    expect(isDue(null, now)).toBe(true);
    expect(isDue({ ...defaultSrs(), nextReviewAt: new Date(now.getTime() - DAY) }, now)).toBe(true);
    expect(isDue({ ...defaultSrs(), nextReviewAt: new Date(now.getTime() + DAY) }, now)).toBe(false);

    const rowNew = { id: "n", position: 0, srs: null };
    const rowOld = {
      id: "o",
      position: 9,
      srs: { ...defaultSrs(), nextReviewAt: new Date(now.getTime() - 2 * DAY) },
    };
    const rowLater = {
      id: "l",
      position: 2,
      srs: { ...defaultSrs(), nextReviewAt: new Date(now.getTime() - DAY) },
    };
    const rowNotDue = {
      id: "x",
      position: 5,
      srs: { ...defaultSrs(), nextReviewAt: new Date(now.getTime() + DAY) },
    };

    expect(pickDueOrder([rowOld, rowNew, rowNotDue, rowLater], now).map((r) => r.id)).toEqual([
      "o",
      "l",
      "n",
    ]);
  });
});

describe("study question helpers", () => {
  const word: StudyWord = {
    wordId: "w1",
    source: "laufen",
    target: "to run",
    grammar: "strong verb",
    position: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    lapses: 0,
  };
  const plain: StudyWord = { ...word, wordId: "w2", source: "gehen", target: "to go", grammar: "" };
  const rows = [word, plain];

  it("appends the grammar note to a word for a consistent display", () => {
    expect(formatWord("laufen", "strong verb")).toBe("laufen, strong verb");
    expect(formatWord("gehen")).toBe("gehen");
    expect(formatWord("gehen", "  ")).toBe("gehen");
  });

  it("accepts a typed answer with or without the appended grammar", () => {
    expect(acceptTypedAnswer("laufen", "laufen", "strong verb")).toBe(true);
    expect(acceptTypedAnswer("laufen, strong verb", "laufen", "strong verb")).toBe(true);
    expect(acceptTypedAnswer("laufen,  strong  verb", "laufen", "strong verb")).toBe(true);
    expect(acceptTypedAnswer("laufen, different", "laufen", "strong verb")).toBe(false);
    expect(acceptTypedAnswer("gehen", "gehen", "")).toBe(true);
  });

  it("normalizes case and whitespace when comparing answers", () => {
    expect(answersMatch("  Laufen ", "laufen")).toBe(true);
    expect(normalizeAnswer("Laufen  Fast")).toBe("laufen fast");
  });

  it("shows the grammar on the source side of the card", () => {
    const s2t = questionFor(word, "flashcard", "sourceToTarget");
    expect(s2t.displayFront).toBe("laufen, strong verb");
    expect(s2t.displayBack).toBe("to run");
    expect(s2t.answerBase).toBe("to run");

    const t2s = questionFor(word, "flashcard", "targetToSource");
    expect(t2s.displayFront).toBe("to run");
    expect(t2s.displayBack).toBe("laufen, strong verb");
    expect(t2s.answerBase).toBe("laufen");
  });

  it("builds grammar question answers from the grammar field", () => {
    const q = questionFor(word, "grammar", "sourceToTarget");
    expect(q.answerBase).toBe("strong verb");
    expect(q.answerField).toBeNull();
  });

  it("formats multiple-choice distractors with the same grammar rule", () => {
    const q = questionFor(word, "flashcard", "sourceToTarget");
    const distractors = buildDistractors(rows, q, "flashcard");
    // Source→target: the field is target, so the only alternative is "to go".
    expect(distractors).toEqual(["to go"]);

    const t2s = questionFor(word, "flashcard", "targetToSource");
    // Target→source: the field is source; "gehen" has no grammar, so it stays plain.
    expect(buildDistractors(rows, t2s, "flashcard")).toEqual(["gehen"]);
  });
});

describe("studyRepository (session + SRS persistence)", () => {
  beforeEach(async () => {
    setDbForTesting(await makeDb());
  });
  afterEach(() => setDbForTesting(null));

  function seedDict() {
    return createDictionary({ name: "Travel", sourceLanguage: "en", targetLanguage: "es" });
  }

  it("lists words as due before any review", () => {
    const dict = seedDict();
    const w1 = createWord({ dictionaryId: dict.id, source: "casa", target: "house" });
    const w2 = createWord({ dictionaryId: dict.id, source: "perro", target: "dog" });

    const due = listDueRows(dict.id).map((r) => r.wordId).sort();
    expect(due).toEqual([w1.id, w2.id].sort());
  });

  it("records a review and schedules the next repetition out of the due set", () => {
    const dict = seedDict();
    const w1 = createWord({ dictionaryId: dict.id, source: "casa", target: "house" });
    const sessionId = startSession(dict.id);

    recordReview({ sessionId, wordId: w1.id, direction: "sourceToTarget", grade: 3, responseTimeMs: 1200 });

    const rows = listStudyRows(dict.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].srs).not.toBeNull();
    expect(rows[0].srs!.repetitions).toBe(1);
    expect(rows[0].srs!.nextReviewAt!.getTime()).toBeGreaterThan(Date.now());
    expect(listDueRows(dict.id)).toHaveLength(0);
  });

  it("stores session totals on finishSession", () => {
    const dict = seedDict();
    const sessionId = startSession(dict.id);
    const w1 = createWord({ dictionaryId: dict.id, source: "casa", target: "house" });

    recordReview({ sessionId, wordId: w1.id, direction: "sourceToTarget", grade: 5, responseTimeMs: 800 });
    finishSession(sessionId, { wordCount: 1, correctCount: 1, wrongCount: 0, durationSeconds: 12 });

    const row = getDatabase()
      .select()
      .from(studySessions)
      .where(eq(studySessions.id, sessionId))
      .get();
    expect(row).not.toBeNull();
    expect(row!.wordCount).toBe(1);
    expect(row!.correctCount).toBe(1);
    expect(row!.mode).toBe("flashcard");
  });
});