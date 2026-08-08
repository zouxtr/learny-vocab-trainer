import { asc, eq } from "drizzle-orm";
import { getDatabase, schedulePersist } from "@/services/database";
import { spacedRepetition, reviews, studySessions, words } from "@/db/schema";
import { computeReview, type Grade, type SrsState, type StudyMode, type StudyWord } from "@/services/study";

/** A word joined with its SRS state (null when never studied). */
export interface DueRow {
  wordId: string;
  source: string;
  target: string;
  position: number;
  srs: SrsState | null;
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** All words of a dictionary joined with their SRS state, due-first ordering. */
export function listStudyRows(dictionaryId: string): DueRow[] {
  const db = getDatabase();
  const rows = db
    .select({
      wordId: words.id,
      source: words.source,
      target: words.target,
      position: words.position,
      easeFactor: spacedRepetition.easeFactor,
      interval: spacedRepetition.interval,
      repetitions: spacedRepetition.repetitions,
      lapses: spacedRepetition.lapses,
      confidence: spacedRepetition.confidence,
      nextReviewAt: spacedRepetition.nextReviewAt,
      lastReviewAt: spacedRepetition.lastReviewAt,
    })
    .from(words)
    .leftJoin(spacedRepetition, eq(words.id, spacedRepetition.wordId))
    .where(eq(words.dictionaryId, dictionaryId))
    .orderBy(asc(words.position))
    .all();

  return rows.map((r) => ({
    wordId: r.wordId,
    source: r.source,
    target: r.target,
    position: r.position,
    srs:
      r.nextReviewAt === undefined
        ? null
        : {
            easeFactor: r.easeFactor ?? 2.5,
            interval: r.interval ?? 0,
            repetitions: r.repetitions ?? 0,
            lapses: r.lapses ?? 0,
            confidence: r.confidence ?? 0,
            nextReviewAt: r.nextReviewAt ?? null,
            lastReviewAt: r.lastReviewAt ?? null,
          },
  }));
}

/** Due words for a dictionary — the queue a study session typically uses. */
export function listDueRows(dictionaryId: string): DueRow[] {
  const rows = listStudyRows(dictionaryId);
  const now = Date.now();
  return rows.filter(
    (r) => r.srs === null || r.srs.nextReviewAt === null || r.srs.nextReviewAt.getTime() <= now,
  );
}

/** Whether a dictionary has any words due for review. */
export function hasDueWords(dictionaryId: string): boolean {
  return listDueRows(dictionaryId).length > 0;
}

/** All words of a dictionary for on-demand study, with grammar + misses. */
export function listStudyWords(dictionaryId: string): StudyWord[] {
  const db = getDatabase();
  const rows = db
    .select({
      wordId: words.id,
      source: words.source,
      target: words.target,
      grammar: words.rektion,
      position: words.position,
      createdAt: words.createdAt,
      lapses: spacedRepetition.lapses,
    })
    .from(words)
    .leftJoin(spacedRepetition, eq(words.id, spacedRepetition.wordId))
    .where(eq(words.dictionaryId, dictionaryId))
    .orderBy(asc(words.position))
    .all();

  return rows.map((r) => ({
    wordId: r.wordId,
    source: r.source,
    target: r.target,
    grammar: r.grammar ?? "",
    position: r.position,
    createdAt: r.createdAt,
    lapses: r.lapses ?? 0,
  }));
}

/** Create the study_sessions row for a new session. */
export function startSession(dictionaryId: string, mode: StudyMode = "flashcard"): string {
  const db = getDatabase();
  const id = uid("session");
  db.insert(studySessions)
    .values({ id, dictionaryId, mode })
    .run();
  schedulePersist();
  return id;
}

export interface SessionResult {
  wordCount: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
}

/** Store final counts on the session row (called when the session ends). */
export function finishSession(sessionId: string, result: SessionResult): void {
  getDatabase()
    .update(studySessions)
    .set({
      wordCount: result.wordCount,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      durationSeconds: result.durationSeconds,
    })
    .where(eq(studySessions.id, sessionId))
    .run();
  schedulePersist();
}

export interface ReviewInput {
  sessionId: string;
  wordId: string;
  mode?: StudyMode;
  direction: "sourceToTarget" | "targetToSource";
  grade: Grade;
  responseTimeMs: number;
}

/** Persist one review answer and update the word's SRS state. */
export function recordReview(input: ReviewInput): void {
  const db = getDatabase();
  const isCorrect = input.grade >= 3;
  const next = computeReview(getSrsState(input.wordId), input.grade);

  db.insert(reviews)
    .values({
      id: uid("review"),
      wordId: input.wordId,
      sessionId: input.sessionId,
      mode: input.mode ?? "flashcard",
      direction: input.direction,
      isCorrect,
      confidence: input.grade,
      responseTimeMs: input.responseTimeMs,
    })
    .run();

  db.insert(spacedRepetition)
    .values({
      wordId: input.wordId,
      easeFactor: next.easeFactor,
      interval: next.interval,
      repetitions: next.repetitions,
      lapses: next.lapses,
      confidence: next.confidence,
      nextReviewAt: next.nextReviewAt,
      lastReviewAt: next.lastReviewAt,
    })
    .onConflictDoUpdate({
      target: spacedRepetition.wordId,
      set: {
        easeFactor: next.easeFactor,
        interval: next.interval,
        repetitions: next.repetitions,
        lapses: next.lapses,
        confidence: next.confidence,
        nextReviewAt: next.nextReviewAt,
        lastReviewAt: next.lastReviewAt,
      },
    })
    .run();

  schedulePersist();
}

/** Fetch a word's current SRS row, or `null` when never studied. */
export function getSrsState(wordId: string): SrsState | null {
  const db = getDatabase();
  const row = db
    .select()
    .from(spacedRepetition)
    .where(eq(spacedRepetition.wordId, wordId))
    .get();
  if (!row) return null;
  return {
    easeFactor: row.easeFactor,
    interval: row.interval,
    repetitions: row.repetitions,
    lapses: row.lapses,
    confidence: row.confidence,
    nextReviewAt: row.nextReviewAt,
    lastReviewAt: row.lastReviewAt,
  };
}