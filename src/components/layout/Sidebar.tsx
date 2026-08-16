import { NavLink } from "react-router-dom";
import { BookMarked, CircleHelp, House, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import { useT } from "@/lib/i18n";

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof House;
  end?: boolean;
  outlineIcon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "Home", icon: House, end: true },
  { to: "/dictionaries", labelKey: "Dictionaries", icon: BookMarked },
  { to: "/study", labelKey: "Study", icon: Sparkles },
  { to: "/settings", labelKey: "Settings", icon: Settings },
  { to: "/how-it-works", labelKey: "How it works", icon: CircleHelp, outlineIcon: true },
];

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const t = useT();

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-card p-3 transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex items-center gap-2 px-2 py-2", collapsed && "justify-center")}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BookMarked className="h-4 w-4" />
        </span>
        {!collapsed && (
          <span className="truncate font-heading text-lg font-semibold tracking-tight">
            Lex<span className="text-primary">i!</span>
          </span>
        )}
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                collapsed && "justify-center px-0",
                isActive && "bg-accent text-accent-foreground",
              )
            }
          >
            <item.icon
              className="h-4 w-4 shrink-0"
              fill={item.outlineIcon ? "none" : "currentColor"}
              strokeWidth={1.5}
            />
            {!collapsed && (
              <>
                <span className="truncate">{t(item.labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={toggleSidebar}
        className="rounded-md px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {collapsed ? t("Expand") : t("Collapse")}
      </button>
    </aside>
  );
}