import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eye,
  Play,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/field";
import { MenuSelect } from "@/components/ui/MenuSelect";
import { formatLanguagePair, getLanguage } from "@/lib/languages";
import { useDictionaryStore } from "@/stores/dictionaryStore";
import { useStudyStore } from "@/stores/studyStore";
import type { DictionaryWithCount } from "@/stores/dictionaryStore";
import {
  buildDistractors,
  questionFor,
  shuffle,
  type Direction,
  type Grade,
  type SelectionMode,
  type StudyMode,
  type StudySort,
  type StudyWord,
} from "@/services/study";
import { cn } from "@/lib/utils";

export function StudyPage() {
  const dictionaries = useDictionaryStore((s) => s.dictionaries);
  const refresh = useDictionaryStore((s) => s.refresh);
  const phase = useStudyStore((s) => s.phase);
  const reset = useStudyStore((s) => s.reset);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Clearing session state on unmount keeps a stale queue from leaking into
  // the next visit.
  useEffect(() => reset, [reset]);

  if (phase === "setup") return <SetupScreen />;
  if (phase === "review") return <ReviewScreen />;
  if (phase === "summary") return <SummaryScreen />;

  return (
    <main className="scrollbar-thin flex flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Study</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a dictionary, configure a session, and review its words with spaced repetition.
        </p>
      </header>

      {dictionaries.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No dictionaries yet. Create one and add words before studying.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dictionaries.map((d) => (
            <DictionaryStudyCard key={d.id} dictionary={d} />
          ))}
        </section>
      )}
    </main>
  );
}

function DictionaryStudyCard({ dictionary }: { dictionary: DictionaryWithCount }) {
  const pick = useStudyStore((s) => s.pick);

  return (
    <button
      type="button"
      onClick={() =>
        pick({
          id: dictionary.id,
          name: dictionary.name,
          sourceLanguage: dictionary.sourceLanguage,
          targetLanguage: dictionary.targetLanguage,
        })
      }
      disabled={dictionary.wordCount === 0}
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md",
        dictionary.wordCount === 0 && "cursor-not-allowed opacity-50",
      )}
    >
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        <span className="truncate text-sm font-semibold">{dictionary.name}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {formatLanguagePair(dictionary.sourceLanguage, dictionary.targetLanguage)}
      </p>
      <p className="text-xs text-muted-foreground">
        {dictionary.wordCount} {dictionary.wordCount === 1 ? "word" : "words"}
      </p>
    </button>
  );
}

const MODES: { value: StudyMode; label: string; hint?: string }[] = [
  { value: "flashcard", label: "Flashcards" },
  { value: "multipleChoice", label: "Multiple choice" },
  { value: "grammar", label: "Grammar" },
  { value: "typing", label: "Typing" },
];

const DIRECTIONS: { value: Direction; label: string; hint?: string }[] = [
  { value: "sourceToTarget", label: "Source → Target" },
  { value: "targetToSource", label: "Target → Source" },
];

const SELECTIONS: { value: SelectionMode; label: string; hint: string }[] = [
  { value: "all", label: "All words", hint: "Every word in the dictionary" },
  { value: "random", label: "Random", hint: "Pick a fixed-size random sample" },
  { value: "manual", label: "Choose", hint: "Manually tick words to include" },
];

const SORTS: { value: StudySort; label: string; hint?: string }[] = [
  { value: "position", label: "In order" },
  { value: "dateAdded", label: "Newest first" },
  { value: "mostMissed", label: "Most missed" },
];

/** Second step: configure the session before it starts. */
function SetupScreen() {
  const dictionary = useStudyStore((s) => s.dictionary);
  const available = useStudyStore((s) => s.available);

  const mode = useStudyStore((s) => s.mode);
  const direction = useStudyStore((s) => s.direction);
  const selection = useStudyStore((s) => s.selection);
  const sort = useStudyStore((s) => s.sort);
  const count = useStudyStore((s) => s.count);
  const manualIds = useStudyStore((s) => s.manualIds);
  const shuffleEnabled = useStudyStore((s) => s.shuffle);

  const setMode = useStudyStore((s) => s.setMode);
  const setDirection = useStudyStore((s) => s.setDirection);
  const setSelection = useStudyStore((s) => s.setSelection);
  const setSort = useStudyStore((s) => s.setSort);
  const setCount = useStudyStore((s) => s.setCount);
  const toggleManualId = useStudyStore((s) => s.toggleManualId);
  const setAllManual = useStudyStore((s) => s.setAllManual);
  const setShuffle = useStudyStore((s) => s.setShuffle);
  const start = useStudyStore((s) => s.start);
  const back = useStudyStore((s) => s.back);

  const manualEnabled = selection === "manual";
  const max = Math.max(1, available.length);

  if (!dictionary) return null;

  return (
    <main className="scrollbar-thin flex flex-1 overflow-y-auto p-4 sm:p-6">
      <section className="mx-auto flex w-full max-w-lg flex-col gap-6 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{dictionary.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatLanguagePair(dictionary.sourceLanguage, dictionary.targetLanguage)}
          </p>
        </div>

        <Field label="Mode">
          <MenuSelect
            value={mode}
            onChange={setMode}
            options={MODES}
          />
        </Field>

        <Field label="Direction">
          <MenuSelect
            value={direction}
            onChange={setDirection}
            options={DIRECTIONS}
          />
        </Field>

        <Field label="Words to include">
          <MenuSelect
            value={selection}
            onChange={setSelection}
            options={SELECTIONS}
          />
          {manualEnabled && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {manualIds.length} of {available.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => setAllManual(manualIds.length !== available.length)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {manualIds.length === available.length ? "Clear all" : "Select all"}
                </button>
              </div>
              <ul className="scrollbar-thin max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {available.map((w, idx) => (
                  <li key={w.wordId}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                        manualIds.includes(w.wordId) && "bg-primary/10",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={manualIds.includes(w.wordId)}
                        onChange={() => toggleManualId(w.wordId)}
                        className="accent-primary"
                      />
                      <span className="text-muted-foreground">{idx + 1}.</span>
                      <span className="truncate">
                        {w.source} {w.target && <span className="text-muted-foreground">→ {w.target}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Sort by">
            <MenuSelect
              value={sort}
              onChange={setSort}
              options={SORTS}
            />
          </Field>

          <div className="flex flex-col gap-4">
            <Field label="Count" hint={`Between 1 and ${max}`}>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={max}
                  value={count || ""}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">/ {max}</span>
              </div>
            </Field>

            <Field label="Shuffle order">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={shuffleEnabled}
                  onChange={(e) => setShuffle(e.target.checked)}
                  className="accent-primary"
                />
                <span className="text-sm">Randomize card order</span>
              </label>
            </Field>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={start}
            disabled={manualEnabled && manualIds.length === 0}
            className="flex-1"
          >
            <Play className="h-4 w-4" />
            {mode === "flashcard" ? "Start studying" : "Start session"}
          </Button>
          <Button variant="ghost" onClick={back}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      </section>
    </main>
  );
}

const FLASH_BUTTONS: { grade: Grade; label: string; className: string }[] = [
  { grade: 3, label: "Correct", className: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" },
  { grade: 1, label: "Wrong", className: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
];

/** Third step: review cards, one per mode. */
function ReviewScreen() {
  const queue = useStudyStore((s) => s.queue);
  const dictionary = useStudyStore((s) => s.dictionary);
  const mode = useStudyStore((s) => s.mode);
  const direction = useStudyStore((s) => s.direction);
  const flipped = useStudyStore((s) => s.flipped);
  const flip = useStudyStore((s) => s.flip);
  const grade = useStudyStore((s) => s.grade);
  const submitAnswer = useStudyStore((s) => s.submitAnswer);
  const previous = useStudyStore((s) => s.previous);
  const next = useStudyStore((s) => s.next);
  const advance = useStudyStore((s) => s.advance);
  const revealed = useStudyStore((s) => s.revealed);
  const feedback = useStudyStore((s) => s.feedback);
  const abort = useStudyStore((s) => s.abort);
  const planned = useStudyStore((s) => s.planned);
  const history = useStudyStore((s) => s.history);

  const [draft, setDraft] = useState<string>("");

  // Reset the answer draft whenever the presented card changes.
  useEffect(() => setDraft(""), [revealed, queue.length]);

  if (queue.length === 0 || !dictionary) return null;

  const item = queue[0];
  const card = item.card;
  const q = questionFor(card, mode, direction);
  const progress = Math.min(planned, planned - queue.length + 1);
  const isQuiz = mode !== "flashcard";
  const frontLabel = q.frontField === "source"
    ? getLanguage(dictionary.sourceLanguage)?.name ?? "Word"
    : getLanguage(dictionary.targetLanguage)?.name ?? "Word";
  const canGoBack = history.length > 0;

  const submit = () => {
    if (draft.trim().length === 0) return;
    submitAnswer(draft);
    setDraft("");
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-4 sm:p-6">
      <div className="flex w-full max-w-md items-center justify-between gap-2 text-sm text-muted-foreground">
        <button type="button" onClick={abort} className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="truncate font-medium">{dictionary.name}</span>
        </button>
        <span>
          Card {progress} / {planned}
        </span>
      </div>

      {(isQuiz) && (
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {mode === "multipleChoice" ? "Multiple choice" : mode === "grammar" ? "Grammar" : "Typing"}
        </p>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={mode === "flashcard" ? flip : undefined}
        onKeyDown={(e) => mode === "flashcard" && e.key === "Enter" && flip()}
        className={cn(
          "flex w-full max-w-md flex-col items-center gap-2 rounded-xl border border-border bg-card px-6 py-10 text-center shadow-sm",
          mode === "flashcard" && "cursor-pointer transition-shadow hover:shadow-md",
        )}
      >
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {isQuiz ? frontLabel : flipped ? "" : frontLabel}
        </span>
        <p className="text-3xl font-semibold tracking-tight">{flipped ? q.displayBack : q.displayFront}</p>
        {isQuiz && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> Type your answer, then check
          </p>
        )}
      </div>

      {feedback && (
        <div
          className={cn(
            "flex w-full max-w-md items-center gap-2 rounded-lg border px-4 py-3 text-sm",
            feedback.correct ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "border-destructive/40 bg-destructive/10 text-destructive",
          )}
        >
          {feedback.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <span>
            {feedback.correct ? "Correct" : `Not quite — answer: ${feedback.answerText}`}
          </span>
        </div>
      )}

      {mode === "flashcard" && (
        <>
          {flipped ? (
            <div className="flex w-full max-w-md flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                How well did you know it?
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button variant="outline" onClick={previous} disabled={!canGoBack} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  Previous
                </Button>
                {FLASH_BUTTONS.map((b) => (
                  <Button key={b.label} onClick={() => grade(b.grade)} className={b.className} variant="outline">
                    {b.label}
                  </Button>
                ))}
                <Button variant="outline" onClick={next} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex w-full max-w-md flex-col gap-2">
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" /> Click the card to reveal
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button variant="outline" onClick={previous} disabled={!canGoBack} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  Previous
                </Button>
                <span />
                <span />
                <Button variant="outline" onClick={next} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {mode !== "flashcard" && (
        <div className="flex w-full max-w-md flex-col gap-3">
          {mode === "multipleChoice" && !revealed && (
            <Options key={card.wordId} card={card} mode={mode} direction={direction} onPick={submitAnswer} />
          )}
          {mode !== "multipleChoice" && !revealed && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="flex flex-col gap-3"
            >
              <Input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={mode === "grammar" ? "Type the grammar notes…" : "Type the translation…"}
                disabled={revealed}
              />
              <Button type="submit" disabled={draft.trim().length === 0 || revealed}>
                Check answer
              </Button>
            </form>
          )}
          {revealed && (
            <Button onClick={advance} className="w-full">
              Next
            </Button>
          )}
        </div>
      )}
    </main>
  );
}

function Options({
  card,
  mode,
  direction,
  onPick,
}: {
  card: StudyWord;
  mode: "multipleChoice" | "grammar" | "typing";
  direction: "sourceToTarget" | "targetToSource";
  onPick: (value: string) => void;
}) {
  const available = useStudyStore((s) => s.available);
  const revealed = useStudyStore((s) => s.revealed);

  const { answer, distractors } = useMemo(() => {
    const q = questionFor(card, mode, direction);
    const distractors = buildDistractors(available, q, mode);
    return { answer: q.displayBack, distractors };
  }, [card, mode, direction, available]);

  const options = useMemo(() => shuffle([answer, ...distractors]).slice(0, 4), [answer, distractors]);

  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((opt) => (
        <Button
          key={opt}
          variant="outline"
          className="justify-start truncate"
          disabled={revealed}
          onClick={() => onPick(opt)}
        >
          {opt || "\u00A0"}
        </Button>
      ))}
    </div>
  );
}

/** Final step: session summary. */
function SummaryScreen() {
  const counts = useStudyStore((s) => s.counts);
  const dictionary = useStudyStore((s) => s.dictionary);
  const answeredUnique = useStudyStore((s) => s.answeredUnique);
  const reset = useStudyStore((s) => s.reset);

  const correct = counts.good + counts.easy;
  const wrong = counts.again + counts.hard;
  const accuracy = answeredUnique > 0 ? Math.round((correct / Math.max(1, correct + wrong)) * 100) : 0;

  return (
    <main className="flex flex-1 items-center justify-center overflow-y-auto p-4 sm:p-6">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8">
        {dictionary && (
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{dictionary.name}</p>
        )}
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Session complete</h2>

        <div className="mt-6 flex items-center justify-around gap-4">
          <Stat icon={CheckCircle2} label="Correct" value={correct} accent="text-emerald-500" />
          <Stat icon={XCircle} label="Wrong" value={wrong} accent="text-destructive" />
          <div className="text-center">
            <p className="text-2xl font-semibold">{accuracy}%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {answeredUnique} {answeredUnique === 1 ? "word" : "words"} reviewed this session.
        </p>

        <div className="mt-6 flex justify-center">
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Start another session
          </Button>
        </div>
      </section>
    </main>
  );
}

interface StatProps {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  accent: string;
}

function Stat({ icon: Icon, label, value, accent }: StatProps) {
  return (
    <div className="text-center">
      <Icon className={cn("mx-auto h-6 w-6", accent)} />
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}