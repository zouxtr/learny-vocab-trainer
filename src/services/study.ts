/**
 * Spaced-repetition scheduling (SM-2–style) for LearnY.
 *
 * Pure functions with no DB access so the scheduler is easy to unit test.
 * Grades in [1,5]; a grade of 3 or higher counts as a correct review.
 */

/** Self-review confidence for a single flashcard answer. */
export type Grade = 1 | 2 | 3 | 4 | 5;

/** SRS state as stored in `spaced_repetition`. */
export interface SrsState {
  easeFactor: number;
  interval: number; // days
  repetitions: number;
  lapses: number;
  confidence: number; // last grade (1-5)
  nextReviewAt: Date | null;
  lastReviewAt: Date | null;
}

export const PASS_GRADE: Grade = 3;
export const MIN_EASE = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A fresh SRS row for a never-studied word. */
export function defaultSrs(): SrsState {
  return {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    lapses: 0,
    confidence: 0,
    nextReviewAt: null,
    lastReviewAt: null,
  };
}

function addDays(days: number, from: Date): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute the next SRS state after answering a word with the given grade.
 * Mirrors classic SM-2 progression: intervals 1 → 6 → 6×ease, ease grown on
 * correct answers and trimmed on failures.
 */
export function computeReview(
  current: SrsState | null,
  grade: Grade,
  now: Date = new Date(),
): SrsState {
  const base = current ?? defaultSrs();

  let easeFactor = base.easeFactor;
  let repetitions = base.repetitions;
  let lapses = base.lapses;
  let interval: number;

  if (grade < PASS_GRADE) {
    // Failed review: forget a little, reset repetition stage, re-learn soon.
    lapses += 1;
    repetitions = 0;
    easeFactor = Math.max(MIN_EASE, round2(easeFactor - 0.2));
    interval = 1;
  } else {
    repetitions += 1;
    easeFactor = Math.max(MIN_EASE, round2(easeFactor + (grade === 5 ? 0.15 : 0.1)));

    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.max(1, Math.round(intervalBase(base.interval) * easeFactor));
    // Cap SM-2's unbounded growth for a vocabulary trainer revisiting content.
    interval = Math.min(interval, 365);
  }

  return {
    easeFactor,
    interval,
    repetitions,
    lapses,
    confidence: grade,
    nextReviewAt: addDays(interval, now),
    lastReviewAt: now,
  };
}

/** The interval that applied before this review, used for geometric growth. */
function intervalBase(interval: number): number {
  // A fresh card (interval 0) falls back to the canonical second interval;
  // otherwise keep SM-2's stored interval as-is.
  return interval > 0 ? interval : 6;
}

/** Whether a grade counts as a passed (correct) review. */
export function isCorrect(grade: Grade): boolean {
  return grade >= PASS_GRADE;
}

/** Whether a word is due for review given its SRS state. */
export function isDue(srs: SrsState | null, now: Date = new Date()): boolean {
  return srs === null || srs.nextReviewAt === null || srs.nextReviewAt.getTime() <= now.getTime();
}

/** Sort due candidates: scheduled reviews first by due date, new cards last. */
export function pickDueOrder<T extends { srs: SrsState | null; position: number }>(
  rows: T[],
  now: Date = new Date(),
): T[] {
  return rows
    .filter((r) => isDue(r.srs, now))
    .sort((a, b) => {
      const aDue = a.srs?.nextReviewAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bDue = b.srs?.nextReviewAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;
      return a.position - b.position;
    });
}

/* ------------------------------------------------------------------ *
 * Study session configuration: on-demand word selection & quiz helpers
 * ------------------------------------------------------------------ */

/** A word available to include in a study session. */
export interface StudyWord {
  wordId: string;
  source: string;
  target: string;
  grammar: string;
  position: number;
  createdAt: Date;
  lapses: number; // times previously answered "Again"/wrong
}

export type StudyMode = "flashcard" | "multipleChoice" | "grammar" | "typing";
export type Direction = "sourceToTarget" | "targetToSource";
export type SelectionMode = "all" | "random" | "manual";
export type StudySort = "position" | "dateAdded" | "mostMissed";
export type QuestionField = "source" | "target";

/** Config a session is launched from. */
export interface StudyConfig {
  mode: StudyMode;
  direction: Direction;
  selection: SelectionMode;
  count: number;
  sort: StudySort;
  manualIds: string[];
  shuffle: boolean;
}

/** Sort a word set into a stable presentation order. */
export function sortStudyWords(rows: StudyWord[], sort: StudySort): StudyWord[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "mostMissed") {
      if (b.lapses !== a.lapses) return b.lapses - a.lapses;
      return a.position - b.position;
    }
    if (sort === "dateAdded") {
      if (a.createdAt.getTime() !== b.createdAt.getTime()) return a.createdAt.getTime() - b.createdAt.getTime();
      return a.position - b.position;
    }
    return a.position - b.position;
  });
  return copy;
}

/** Fisher–Yates shuffle (deterministic when given an RNG for tests). */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Pick the words for a session from the dictionary's full word list. */
export function selectStudyWords(
  rows: StudyWord[],
  config: StudyConfig,
  rng: () => number = Math.random,
): StudyWord[] {
  const sorted = sortStudyWords(rows, config.sort);

  if (config.selection === "manual") {
    const ids = new Set(config.manualIds);
    return sorted
      .filter((w) => ids.has(w.wordId))
      .slice(0, Math.max(0, config.count));
  }
  if (config.selection === "random") {
    return shuffle(sorted, rng).slice(0, Math.max(0, config.count));
  }
  return sorted.slice(0, Math.max(0, config.count));
}

/** Text of a normalized answer for normalization/equality checks. */
export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Whether two strings compare equal after normalization. */
export function answersMatch(a: string, b: string): boolean {
  return normalizeAnswer(a) === normalizeAnswer(b);
}

/**
 * Consistent "word, grammar" label used across card types. Grammar marks are
 * only shown when present (e.g. "laufen, strong verb").
 */
export function formatWord(word: string, grammar = ""): string {
  const trimmed = grammar.trim();
  return trimmed ? `${word}, ${trimmed}` : word;
}

/** Whether a typed answer matches, optionally accepting an appended grammar. */
export function acceptTypedAnswer(typed: string, base: string, grammar = ""): boolean {
  if (answersMatch(typed, base)) return true;
  if (!grammar.trim()) return false;
  return answersMatch(typed, formatWord(base, grammar));
}

/** Build the front/back display for a word under a mode + direction. */
export function questionFor(word: StudyWord, mode: StudyMode, direction: Direction): StudyQuestion {
  const isTargetToSource = direction === "targetToSource";
  const frontField: QuestionField = isTargetToSource ? "target" : "source";
  const backField: QuestionField = isTargetToSource ? "source" : "target";
  const front = isTargetToSource ? word.target : word.source;
  const back = isTargetToSource ? word.source : word.target;

  // Show the grammar note next to whichever side is the source word.
  const displayFront = frontField === "source" ? formatWord(word.source, word.grammar) : front;
  const displayBack = backField === "source" ? formatWord(word.source, word.grammar) : back;

  // A grammar question expects the grammar note itself; otherwise the word.
  const isGrammar = mode === "grammar";
  const answerField = isGrammar ? null : backField;
  const answerDisplay = isGrammar ? word.grammar : back;
  const answerBase =
    isGrammar
      ? word.grammar
      : backField === "source"
        ? word.source
        : word.target;

  return {
    word,
    frontField,
    backField,
    front,
    back,
    displayFront,
    displayBack,
    answerField,
    answerBase,
    answerDisplay,
    answerText: answerDisplay,
  };
}

/** The correctness-bearing answer for a question (translation or grammar). */
export interface StudyQuestion {
  word: StudyWord;
  frontField: QuestionField;
  backField: QuestionField;
  front: string;
  back: string;
  /** Word‑side values, grammar attached to the source side when present. */
  displayFront: string;
  displayBack: string;
  /** The field holding the expected answer ("source" | "target" | "grammar"), or null for the raw text. */
  answerField: "source" | "target" | "grammar" | null;
  /** Plain answer text (no grammar), used for strict comparisons. */
  answerBase: string;
  /** Answer text with optional grammar attached, used for presentation. */
  answerDisplay: string;
  /** Alias of {@link answerDisplay} for backward compatibility. */
  answerText: string;
}

/**
 * Multiple-choice distractors: up to 3 other different values from the same
 * dictionary. Values are formatted with the same "word, grammar" rule as the
 * correct answer so all options read consistently.
 */
export function buildDistractors(
  rows: StudyWord[],
  question: StudyQuestion,
  mode: StudyMode,
  rng: () => number = Math.random,
): string[] {
  const isGrammarMode = mode === "grammar";
  const field: "grammar" | "source" | "target" = isGrammarMode
    ? "grammar"
    : question.backField;
  const display = (w: StudyWord): string => {
    if (field === "grammar") return w.grammar;
    if (field === "source") return formatWord(w.source, w.grammar);
    return w.target;
  };
  const ownDisplay = display(question.word);
  const candidates = rows
    .map(display)
    .filter((value, idx, arr) => value && value !== ownDisplay && arr.indexOf(value) === idx);
  return shuffle(candidates, rng).slice(0, 3);
}