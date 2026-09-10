import { create } from "zustand";
import { startSession, finishSession, recordReview, recordFlashcardView, listStudyWords, attachReviewCounts } from "@/services/studyRepository";
import {
  acceptTypedAnswer,
  answersMatch,
  questionFor,
  selectStudyWords,
  shuffle,
  type Direction,
  type Grade,
  type SelectionMode,
  type StudyConfig,
  type StudyMode,
  type StudySort,
  type StudyWord,
} from "@/services/study";

export type StudyPhase = "pick" | "setup" | "review" | "summary";

export interface StudyBucketCounts {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface StudyDictionary {
  id: string;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  color?: string | null;
}

interface QueueItem {
  card: StudyWord;
  /** Wrong attempts so far for this card within this session. */
  misses: number;
}

export interface AnswerFeedback {
  correct: boolean;
  answerText: string;
}

/** How many "Again" re-queues are allowed for a flashcard self-graded card. */
const MAX_FLASH_REQUEUE = 3;

export interface StudyStateFields {
  phase: StudyPhase;
  dictionary: StudyDictionary | null;
  available: StudyWord[];

  mode: StudyMode;
  direction: Direction;
  selection: SelectionMode;
  sort: StudySort;
  count: number;
  manualIds: string[];
  shuffle: boolean;
  /** Only include words from this group (null = all groups). */
  group: string | null;

  queue: QueueItem[];
  /** Cards already presented (graded or skipped) — used by Previous. */
  history: QueueItem[];
  /** Word already counted as seen for the currently shown card (flip-once-per-turn). */
  viewedWordId: string | null;
  planned: number;
  sessionId: string | null;
  startedAt: number;
  shownAt: number;
  flipped: boolean;
  revealed: boolean;
  feedback: AnswerFeedback | null;
  counts: StudyBucketCounts;
  answeredUnique: number;

  pick: (dictionary: StudyDictionary) => void;
  back: () => void;
  setMode: (mode: StudyMode) => void;
  setDirection: (direction: Direction) => void;
  setSelection: (selection: SelectionMode) => void;
  setSort: (sort: StudySort) => void;
  setCount: (count: number) => void;
  toggleManualId: (id: string) => void;
  setAllManual: (on: boolean) => void;
  setShuffle: (shuffle: boolean) => void;
  setGroup: (group: string | null) => void;
  start: () => void;
  flip: () => void;
  grade: (grade: Grade) => void;
  submitAnswer: (answer: string) => void;
  previous: () => void;
  next: () => void;
  advance: () => void;
  abort: () => void;
  reset: () => void;
}

interface StudyState extends StudyStateFields {}

const emptyCounts = (): StudyBucketCounts => ({ again: 0, hard: 0, good: 0, easy: 0 });

function bucketFor(grade: Grade): keyof StudyBucketCounts {
  if (grade <= 1) return "again";
  if (grade === 2) return "hard";
  if (grade === 5) return "easy";
  return "good";
}

function configOf(s: StudyState): StudyConfig {
  return {
    mode: s.mode,
    direction: s.direction,
    selection: s.selection,
    sort: s.sort,
    count: s.count,
    manualIds: s.manualIds,
    shuffle: s.shuffle,
  };
}

/** Answer text expected for the current card under the current mode/direction. */
function answerTextFor(state: StudyState, card: StudyWord, showGrammar = true): string {
  const q = questionFor(card, state.mode, state.direction);
  if (state.mode === "grammar") return q.answerText;
  return showGrammar ? q.displayBack : q.answerBase;
}

/** Persist the review row + SRS state for one answer. */
function recordReviewSafely(state: StudyState, wordId: string, grade: Grade): void {
  if (!state.sessionId) return;
  recordReview({
    sessionId: state.sessionId,
    wordId,
    mode: state.mode,
    direction: state.direction === "targetToSource" ? "targetToSource" : "sourceToTarget",
    grade,
    responseTimeMs: Math.max(0, Date.now() - state.shownAt),
  });
}

/** Finish the session row and return the partial state that moves to summary. */
function wrapUp(state: StudyState): Partial<StudyState> {
  if (state.sessionId) {
    finishSession(state.sessionId, {
      wordCount: state.answeredUnique,
      correctCount: state.counts.good + state.counts.easy,
      wrongCount: state.counts.again + state.counts.hard,
      durationSeconds: Math.max(1, Math.round((Date.now() - state.startedAt) / 1000)),
    });
  }
  return { ...state, phase: "summary", queue: [], history: [], revealed: false, feedback: null, flipped: false };
}

export const useStudyStore = create<StudyState>()((set, get) => ({
  phase: "pick",
  dictionary: null,
  available: [],
  mode: "flashcard",
  direction: "sourceToTarget",
  selection: "all",
  sort: "position",
  count: 0,
  manualIds: [],
  shuffle: true,
  group: null,
  queue: [],
  history: [],
  viewedWordId: null,
  planned: 0,
  sessionId: null,
  startedAt: 0,
  shownAt: 0,
  flipped: false,
  revealed: false,
  feedback: null,
  counts: emptyCounts(),
  answeredUnique: 0,

  pick: (dictionary) => {
    const available = attachReviewCounts(listStudyWords(dictionary.id));
    set({
      phase: "setup",
      dictionary,
      available,
      mode: "flashcard",
      direction: "sourceToTarget",
      selection: "all",
      sort: "position",
      count: available.length,
      manualIds: [],
      shuffle: true,
      group: null,
      history: [],
    });
  },

  back: () => {
    set({
      phase: "pick",
      dictionary: null,
      available: [],
      manualIds: [],
      group: null,
      sessionId: null,
      queue: [],
      history: [],
      feedback: null,
    });
  },

  setMode: (mode) => set({ mode }),
  setDirection: (direction) => set({ direction }),
  setSelection: (selection) => {
    if (selection !== "manual") {
      set({ selection });
      return;
    }
    const { available, group, count, manualIds } = get();
    const pool = group ? available.filter((w) => (w.group ?? "").trim() === group) : available;
    if (manualIds.length === 0) {
      set({ selection, manualIds: pool.slice(0, Math.max(1, count)).map((w) => w.wordId) });
    } else {
      set({ selection });
    }
  },
  setSort: (sort) => set({ sort }),
  setCount: (count) => {
    const { available, group } = get();
    const pool = group ? available.filter((w) => (w.group ?? "").trim() === group) : available;
    const max = Math.max(1, pool.length);
    set({ count: Math.max(1, Math.min(count, max)) });
  },
  toggleManualId: (id) => {
    const { manualIds } = get();
    set({
      manualIds: manualIds.includes(id) ? manualIds.filter((x) => x !== id) : [...manualIds, id],
    });
  },
  setAllManual: (on) => {
    const { available, group } = get();
    const pool = group ? available.filter((w) => (w.group ?? "").trim() === group) : available;
    set({ manualIds: on ? pool.map((w) => w.wordId) : [] });
  },
  setShuffle: (shuffle) => set({ shuffle }),
  setGroup: (group) => {
    const { available, count, manualIds } = get();
    const filtered = group ? available.filter((w) => (w.group ?? "").trim() === group) : available;
    const ids = new Set(filtered.map((w) => w.wordId));
    set({
      group,
      count: Math.max(1, Math.min(count || filtered.length, Math.max(1, filtered.length))),
      manualIds: manualIds.filter((id) => ids.has(id)),
    });
  },

  start: () => {
    const s = get();
    if (!s.dictionary) return;

    const pool = s.group ? s.available.filter((w) => (w.group ?? "").trim() === s.group) : s.available;
    const selected = selectStudyWords(pool, configOf(s));
    const cards = s.shuffle ? shuffle(selected) : selected;
    if (cards.length === 0) return;

    const sessionId = startSession(s.dictionary.id, s.mode);
    const startedAt = Date.now();
    set({
      phase: "review",
      queue: cards.map((card) => ({ card, misses: 0 })),
      history: [],
      planned: cards.length,
      sessionId,
      startedAt,
      shownAt: startedAt,
      flipped: false,
      revealed: false,
      feedback: null,
      counts: emptyCounts(),
      answeredUnique: 0,
      viewedWordId: null,
    });
  },

  flip: () => {
    const s = get();
    // Count the first reveal of the currently shown card only — repeated flips
    // of the same card without moving on don't count again.
    if (
      s.phase === "review" &&
      s.mode === "flashcard" &&
      !s.flipped &&
      s.queue.length > 0 &&
      s.viewedWordId !== s.queue[0].card.wordId
    ) {
      try {
        recordFlashcardView(s.queue[0].card.wordId);
      } catch {
        // Views are best-effort stats; a flip must never break the session.
      }
      set({ flipped: true, viewedWordId: s.queue[0].card.wordId });
      return;
    }
    set({ flipped: !s.flipped });
  },

  grade: (grade) => {
    const s = get();
    if (s.phase !== "review" || !s.sessionId || s.queue.length === 0 || s.mode !== "flashcard") return;
    answerCard(set, s, grade, grade >= 3, grade === 1);
  },

  submitAnswer: (answer) => {
    const s = get();
    if (s.phase !== "review" || !s.sessionId || s.queue.length === 0 || s.mode === "flashcard") return;

    const item = s.queue[0];
    const q = questionFor(item.card, s.mode, s.direction);
    // Typing accepts the plain word or the combined "word, grammar" form.
    const correct =
      s.mode === "grammar"
        ? answersMatch(answer, q.answerBase)
        : acceptTypedAnswer(answer, q.answerBase, item.card.grammar);
    answerCard(set, s, correct ? 3 : 1, correct, false);
  },

  /** Walk back one card without recording a duplicate review. */
  previous: () => {
    const s = get();
    if (s.phase !== "review" || s.history.length === 0) return;
    const item = s.history[s.history.length - 1];
    // If the card was re-queued, drop the stray copy so it is not duplicated.
    const queue = [item, ...s.queue.filter((q) => q.card.wordId !== item.card.wordId)];
    set({
      queue,
      history: s.history.slice(0, -1),
      flipped: false,
      revealed: false,
      feedback: null,
      viewedWordId: null,
      shownAt: Date.now(),
    });
  },

  /** Move on to the next card without grading the current one. */
  next: () => {
    const s = get();
    if (s.phase !== "review" || s.queue.length === 0) return;
    if (s.queue.length === 1) return;
    set({
      queue: s.queue.slice(1),
      flipped: false,
      revealed: false,
      feedback: null,
      viewedWordId: null,
      shownAt: Date.now(),
    });
  },

  advance: () => {
    const s = get();
    if (s.phase !== "review" || !s.revealed) return;
    if (s.queue.length === 0) {
      set(wrapUp(s));
      return;
    }
    set({ revealed: false, feedback: null, viewedWordId: null, shownAt: Date.now() });
  },

  abort: () => {
    const s = get();
    if (s.phase !== "review") return;
    set(wrapUp(s));
  },

  reset: () =>
    set({
      phase: "pick",
      dictionary: null,
      available: [],
      sessionId: null,
      queue: [],
      history: [],
      planned: 0,
      revealed: false,
      feedback: null,
      flipped: false,
      counts: emptyCounts(),
      answeredUnique: 0,
    }),
}));

/**
 * Record one answer (grade + SRS + counts) and re-order the session queue.
 * Quiz modes re-queue a card until it is answered correctly; flashcards re-queue
 * only on "After"; at most a bounded number of times.
 */
function answerCard(
  set: (partial: Partial<StudyState>) => void,
  state: StudyState,
  grade: Grade,
  correct: boolean,
  isFlashRequeue: boolean,
): void {
  const item = state.queue[0];
  recordReviewSafely(state, item.card.wordId, grade);

  const bucket = bucketFor(grade);
  const counts = { ...state.counts, [bucket]: state.counts[bucket] + 1 };
  const answeredUnique = state.answeredUnique + (item.misses === 0 ? 1 : 0);

  let nextQueue = state.queue.slice(1);
  const isFlash = state.mode === "flashcard";
  const requeue = !correct && (isFlash ? isFlashRequeue && item.misses < MAX_FLASH_REQUEUE : true);
  if (requeue) {
    nextQueue = [...nextQueue, { card: item.card, misses: item.misses + 1 }];
  }

  if (isFlash) {
    if (nextQueue.length === 0) {
      set(wrapUp({ ...state, counts, answeredUnique }));
    } else {
      set({
        queue: nextQueue,
        history: [...state.history, item],
        counts,
        answeredUnique,
        flipped: false,
        viewedWordId: null,
        shownAt: Date.now(),
      });
    }
    return;
  }

  // Quiz modes expose the answer before advancing (cards already re-queued).
  set({
    queue: nextQueue,
    counts,
    answeredUnique,
    revealed: true,
    feedback: { correct, answerText: answerTextFor(state, item.card) },
    flipped: false,
  });
}