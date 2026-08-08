import { useState } from "react";
import { NavLink } from "react-router-dom";
import { BookOpen, HelpCircle, LayoutGrid, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpDialog } from "@/components/onboarding/HelpDialog";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: LayoutGrid, end: true },
  { to: "/dictionaries", label: "Dictionaries", icon: BookOpen },
  { to: "/study", label: "Study", icon: Sparkles },
];

/** Bottom navigation shown on small screens where the sidebar is hidden. */
export function MobileNav() {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <nav
      aria-label="Primary"
      className="flex shrink-0 items-center justify-around border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors",
              isActive && "text-primary",
            )
          }
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors"
      >
        <HelpCircle className="h-5 w-5" />
        Help
      </button>

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </nav>
  );
}