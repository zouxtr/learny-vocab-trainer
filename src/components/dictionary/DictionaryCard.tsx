import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Archive, ArchiveRestore, BookOpen, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatLanguagePair } from "@/lib/languages";
import { useT } from "@/lib/i18n";
import { useDictionaryStore, type DictionaryWithCount } from "@/stores/dictionaryStore";
import { DictionaryFormDialog } from "@/components/dictionary/DictionaryFormDialog";

interface DictionaryCardProps {
  dictionary: DictionaryWithCount;
  /** When set, the delete confirmation renders inline instead of using window.confirm. */
  onDelete?: (id: string) => void;
}

export function DictionaryCard({ dictionary, onDelete }: DictionaryCardProps) {
  const favorite = useDictionaryStore((s) => s.favorite);
  const update = useDictionaryStore((s) => s.update);
  const remove = useDictionaryStore((s) => s.remove);
  const navigate = useNavigate();
  const t = useT();

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDelete = () => {
    if (confirmingDelete) {
      if (onDelete) onDelete(dictionary.id);
      else remove(dictionary.id);
    } else {
      setConfirmingDelete(true);
      window.setTimeout(() => setConfirmingDelete(false), 3000);
    }
  };

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: dictionary.color ?? "hsl(262 80% 60%)" }}
          >
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <Link
              to={`/dictionary/${dictionary.id}`}
              className="block truncate text-sm font-semibold hover:text-primary"
            >
              {dictionary.name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              {formatLanguagePair(dictionary.sourceLanguage, dictionary.targetLanguage)}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label={dictionary.isFavorite ? t("Unfavorite") : t("Favorite")}
          onClick={() => favorite(dictionary.id)}
          className={`shrink-0 rounded-md p-1 transition-colors ${
            dictionary.isFavorite ? "text-amber-400" : "text-muted-foreground hover:text-amber-400"
          }`}
        >
          <Star className={`h-4 w-4 ${dictionary.isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {dictionary.wordCount} {dictionary.wordCount === 1 ? t("word") : t("words")}
        </p>
        <div className="flex items-center gap-1 opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            aria-label={t("Add word to {name}", { name: dictionary.name })}
            onClick={() => navigate(`/dictionary/${dictionary.id}?add=1`)}
          >
            <Plus className="h-3.5 w-3.5" /> {t("Add word")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label={t("Edit dictionary")}
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label={dictionary.isArchived ? t("Unarchive") : t("Archive")}
            onClick={() => update(dictionary.id, { isArchived: !dictionary.isArchived })}
          >
            {dictionary.isArchived ? (
              <ArchiveRestore className="h-3.5 w-3.5" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            aria-label={t("Delete dictionary")}
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {confirmingDelete && (
        <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {t("Click delete again to confirm.")}
        </p>
      )}

      <DictionaryFormDialog
        dictionary={dictionary}
        open={editing}
        onOpenChange={setEditing}
      />
    </div>
  );
}