import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface LanguageSelectProps {
  value: string;
  onValueChange: (code: string) => void;
  id?: string;
  className?: string;
}

/** Accessible language dropdown backed by the ISO 639-1 code list. */
export function LanguageSelect({ value, onValueChange, id, className }: LanguageSelectProps) {
  const selected = LANGUAGES.find((l) => l.code === value);
  const t = useT();

  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        id={id}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
          className,
        )}
      >
        <Select.Value placeholder={t("Select language")}>
          {selected ? `${selected.name} (${selected.nativeName})` : value}
        </Select.Value>
        <Select.Icon>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-64 overflow-auto rounded-md border border-border bg-card p-1 shadow-lg"
        >
          <Select.Viewport>
            {LANGUAGES.map((lang) => (
              <Select.Item
                key={lang.code}
                value={lang.code}
                className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
              >
                <Select.ItemText>
                  {lang.name} <span className="text-xs text-muted-foreground">({lang.nativeName})</span>
                </Select.ItemText>
                <Select.ItemIndicator>
                  <Check className="h-4 w-4 text-primary" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}