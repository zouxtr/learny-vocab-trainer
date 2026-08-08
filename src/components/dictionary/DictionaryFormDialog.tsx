import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { LanguageSelect } from "@/components/language/LanguageSelect";
import { useDictionaryStore } from "@/stores/dictionaryStore";
import type { Dictionary } from "@/db/schema";

interface DictionaryFormDialogProps {
  /** When set, the dialog edits this dictionary instead of creating a new one. */
  dictionary?: Dictionary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

const PALETTE = [
  "hsl(262 80% 60%)",
  "hsl(190 90% 50%)",
  "hsl(142 70% 45%)",
  "hsl(15 90% 60%)",
  "hsl(45 95% 55%)",
  "hsl(320 80% 60%)",
];

export function DictionaryFormDialog({
  dictionary,
  open,
  onOpenChange,
  onCreated,
}: DictionaryFormDialogProps) {
  const create = useDictionaryStore((s) => s.create);
  const update = useDictionaryStore((s) => s.update);

  const [name, setName] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("de");
  const [color, setColor] = useState<string | null>(PALETTE[0]);

  // Reset form whenever the dialog is opened (fresh or for a specific dictionary).
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(dictionary?.name ?? "");
      setSourceLanguage(dictionary?.sourceLanguage ?? "en");
      setTargetLanguage(dictionary?.targetLanguage ?? "de");
      setColor(dictionary?.color ?? PALETTE[0]);
    }
    onOpenChange(next);
  };

  const canSubmit = name.trim().length > 0 && sourceLanguage !== targetLanguage;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (dictionary) {
      update(dictionary.id, { name, sourceLanguage, targetLanguage, color });
    } else {
      const row = create({ name, sourceLanguage, targetLanguage, color });
      onCreated?.(row!.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-xl sm:p-6">
          <div className="flex items-start justify-between">
            <Dialog.Title className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <BookOpen className="h-5 w-5 text-primary" />
              {dictionary ? "Edit dictionary" : "Create a dictionary"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <Field label="Name" htmlFor="dict-name" hint="A label like “Spanish for travel”.">
              <Input
                id="dict-name"
                placeholder="My vocabulary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Word language" htmlFor="dict-source">
                <LanguageSelect
                  id="dict-source"
                  value={sourceLanguage}
                  onValueChange={setSourceLanguage}
                />
              </Field>
              <Field label="Translation language" htmlFor="dict-target">
                <LanguageSelect
                  id="dict-target"
                  value={targetLanguage}
                  onValueChange={setTargetLanguage}
                />
              </Field>
            </div>
            {sourceLanguage === targetLanguage && (
              <p className="text-xs text-destructive">The two languages must differ.</p>
            )}

            <Field label="Color" optional>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full transition-transform ${
                      color === c ? "ring-2 ring-ring ring-offset-2" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline">Cancel</Button>
            </Dialog.Close>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {dictionary ? "Save changes" : "Create dictionary"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}