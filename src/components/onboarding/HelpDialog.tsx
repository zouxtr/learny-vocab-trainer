import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, HelpCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const STEPS = [
  {
    icon: BookOpen,
    title: "Create a dictionary",
    body: "Each dictionary is a vocabulary list with a language pair — the word language and the translation language. Examples: English → Spanish, Bulgarian → German.",
  },
  {
    icon: Sparkles,
    title: "Add words",
    body: "A word has a source term and a translation, plus optional fields (grammar, example, group, notes). Review your list anytime.",
  },
  {
    icon: HelpCircle,
    title: "Study",
    body: "Pick a dictionary and practice its words with study sessions. Progress and spaced-repetition are tracked for each word.",
  },
];

export function HelpContent() {
  const t = useT();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold">{t("What is LearnY!?")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("A vocabulary trainer that turns your word lists into interactive study sessions. Everything runs locally in your browser.")}
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
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl">
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
          <div className="mt-4">
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