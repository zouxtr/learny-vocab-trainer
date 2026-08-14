import { useEffect, useRef, useState } from "react";
import { Check, Languages } from "lucide-react";
import { UI_LOCALES, getUiLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Compact language picker shown in the top bar for switching the UI language. */
export function LocaleSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (locale: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = getUiLocale(value);

  // Close when clicking outside the popup.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        title={current ? `${current.name} (${current.nativeName})` : "Language"}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        )}
      >
        {current ? current.nativeName.slice(0, 2).toUpperCase() : <Languages className="h-4 w-4" />}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 max-h-72 w-56 overflow-auto rounded-lg border border-border bg-popover p-1 shadow-xl"
        >
          {UI_LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === value}
              onClick={() => {
                onChange(l.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent",
                l.code === value && "text-primary",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{l.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{l.nativeName}</span>
              </span>
              {l.code === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}