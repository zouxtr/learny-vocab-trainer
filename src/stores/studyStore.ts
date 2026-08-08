import { create } from "zustand";
import { startSession, finishSession, recordReview, listStudyWords } from "@/services/studyRepository";
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

  queue: QueueItem[];
  /** Cards already presented (graded or skipped) — used by Previous. */
  history: QueueItem[];
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
  return { phase: "summary", queue: [], history: [], revealed: false, feedback: null, flipped: false };
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
  queue: [],
  history: [],
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
    const available = listStudyWords(dictionary.id);
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
      history: [],
    });
  },

  back: () => {
    set({
      phase: "pick",
      dictionary: null,
      available: [],
      manualIds: [],
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
    const { available, count, manualIds } = get();
    if (manualIds.length === 0) {
      set({ selection, manualIds: available.slice(0, Math.max(1, count)).map((w) => w.wordId) });
    } else {
      set({ selection });
    }
  },
  setSort: (sort) => set({ sort }),
  setCount: (count) => {
    const max = Math.max(1, get().available.length);
    set({ count: Math.max(1, Math.min(count, max)) });
  },
  toggleManualId: (id) => {
    const { manualIds } = get();
    set({
      manualIds: manualIds.includes(id) ? manualIds.filter((x) => x !== id) : [...manualIds, id],
    });
  },
  setAllManual: (on) => {
    set({ manualIds: on ? get().available.map((w) => w.wordId) : [] });
  },
  setShuffle: (shuffle) => set({ shuffle }),

  start: () => {
    const s = get();
    if (!s.dictionary) return;

    const selected = selectStudyWords(s.available, configOf(s));
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
    });
  },

  flip: () => set((s) => ({ flipped: !s.flipped })),

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
    set({ revealed: false, feedback: null, shownAt: Date.now() });
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