import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { getLanguage } from "@/lib/languages";
import { useDictionaryStore } from "@/stores/dictionaryStore";
import type { Word } from "@/db/schema";

interface WordFormDialogProps {
  dictionaryId: string;
  /** ISO code of the language words are written in (drives input labels). */
  sourceLanguage: string;
  /** ISO code of the language translations are written in (drives input labels). */
  targetLanguage: string;
  /** When set, edits this word instead of adding a new one. */
  word?: Word | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WordFormDialog({
  dictionaryId,
  sourceLanguage,
  targetLanguage,
  word,
  open,
  onOpenChange,
}: WordFormDialogProps) {
  const addWord = useDictionaryStore((s) => s.addWord);
  const editWord = useDictionaryStore((s) => s.editWord);

  const sourceName = getLanguage(sourceLanguage)?.name ?? "Word";
  const targetName = getLanguage(targetLanguage)?.name ?? "Translation";

  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [grammar, setGrammar] = useState("");
  const [example, setExample] = useState("");
  const [group, setGroup] = useState("");
  const [notes, setNotes] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSource(word?.source ?? "");
      setTarget(word?.target ?? "");
      setGrammar(word?.rektion ?? "");
      setExample(word?.example ?? "");
      setGroup(word?.group ?? "");
      setNotes(word?.notes ?? "");
    }
    onOpenChange(next);
  };

  const canSubmit = source.trim().length > 0 && target.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (word) {
      editWord(word.id, {
        source,
        target,
        rektion: grammar || null,
        example: example || null,
        group: group || null,
        notes: notes || null,
      });
    } else {
      addWord({
        dictionaryId,
        source,
        target,
        rektion: grammar || null,
        example: example || null,
        group: group || null,
        notes: notes || null,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-xl sm:p-6">
          <div className="flex items-start justify-between">
            <Dialog.Title className="text-lg font-semibold tracking-tight">
              {word ? "Edit word" : "Add a word"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={sourceName} htmlFor="word-source">
              <Input
                id="word-source"
                placeholder={`The word in ${sourceName}`}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                autoFocus
              />
            </Field>
            <Field label={targetName} htmlFor="word-target">
              <Input
                id="word-target"
                placeholder={`The translation in ${targetName}`}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </Field>
            <Field label="Grammar" htmlFor="word-grammar" optional hint="e.g. feminine noun">
              <Input
                id="word-grammar"
                value={grammar}
                onChange={(e) => setGrammar(e.target.value)}
              />
            </Field>
            <Field label="Group" htmlFor="word-group" optional hint="e.g. Food">
              <Input id="word-group" value={group} onChange={(e) => setGroup(e.target.value)} />
            </Field>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            <Field label="Example" htmlFor="word-example" optional>
              <Input
                id="word-example"
                value={example}
                onChange={(e) => setExample(e.target.value)}
              />
            </Field>
            <Field label="Notes" htmlFor="word-notes" optional>
              <Textarea id="word-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline">Cancel</Button>
            </Dialog.Close>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {word ? "Save changes" : "Add word"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}