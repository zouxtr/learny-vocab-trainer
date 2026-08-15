import * as Dialog from "@radix-ui/react-dialog";
import {
  BookOpen,
  CloudUpload,
  Download,
  HelpCircle,
  Languages,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const STEPS = [
  {
    icon: BookOpen,
    title: "Create a dictionary",
    body: "Each dictionary is a vocabulary list with a language pair — a word language and a translation language, e.g. English → Spanish or Bulgarian → German. Keep one dictionary per topic and favorite or archive them.",
  },
  {
    icon: Plus,
    title: "Add words",
    body: "A word has a source term and a translation, plus optional grammar, example, group, and notes. Add words one by one or import them in bulk from a file, Google Sheet, or TSV link. Export to CSV anytime.",
  },
  {
    icon: Sparkles,
    title: "Study",
    body: "Pick a dictionary and practice its words — flashcards, multiple choice, grammar, or typing — in either direction. Each word gets a spaced-repetition schedule, so the app shows you the words you need to review.",
  },
  {
    icon: HelpCircle,
    title: "Track progress",
    body: "Sessions record your answers. The summary shows how many words you reviewed and your accuracy, and words you keep missing get scheduled again sooner.",
  },
  {
    icon: CloudUpload,
    title: "Cloud sync",
    body: "Your data stays in your browser by default. Optionally connect your own Dropbox to back the database up to the cloud — the app talks to Dropbox directly, with no server or account of its own.",
  },
  {
    icon: Languages,
    title: "15 languages",
    body: "The entire interface is translated into 15 languages. Switch the UI language anytime from the top bar — it’s saved per device.",
  },
];

export function HelpContent() {
  const t = useT();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold">{t("What is LearnY!?")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("A vocabulary trainer that turns your word lists into interactive study sessions. Everything runs locally in your browser — offline, no account needed.")}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {STEPS.map((step) => (
          <div key={step.title} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <step.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium">{t(step.title)}</p>
              <p className="text-sm text-muted-foreground">{t(step.body)}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
        <Download className="h-3.5 w-3.5 shrink-0" />
        {t("Your data never leaves your device unless you connect cloud sync.")}
      </p>
    </div>
  );
}

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const t = useT();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-xl sm:p-6">
          <div className="flex items-start justify-between">
            <Dialog.Title className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <HelpCircle className="h-5 w-5 text-primary" />
              {t("How it works")}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="scrollbar-thin mt-4 max-h-[65vh] overflow-y-auto pr-1">
            <HelpContent />
          </div>
          <div className="mt-6 flex justify-end">
            <Dialog.Close asChild>
              <Button>{t("Got it")}</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}