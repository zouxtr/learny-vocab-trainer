import { useState } from "react";
import { NavLink } from "react-router-dom";
import { BookOpen, HelpCircle, LayoutGrid, Languages, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import { useSyncStore } from "@/stores/syncStore";
import { useT } from "@/lib/i18n";
import { SyncPanel } from "@/components/system/SyncPanel";
import { HelpDialog } from "@/components/onboarding/HelpDialog";

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof BookOpen;
  hintKey?: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "Home", icon: LayoutGrid, end: true },
  { to: "/dictionaries", labelKey: "Dictionaries", icon: BookOpen },
  { to: "/study", labelKey: "Study", icon: Sparkles, hintKey: "Cmd + S" },
];

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const connected = useSyncStore((s) => s.connected);
  const syncing = useSyncStore((s) => s.syncing);
  const lastResult = useSyncStore((s) => s.lastResult);
  const connect = useSyncStore((s) => s.connect);
  const disconnect = useSyncStore((s) => s.disconnect);
  const syncNow = useSyncStore((s) => s.syncNow);
  const t = useT();

  const [helpOpen, setHelpOpen] = useState(false);

  const sync = { connected, syncing, lastResult };

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-card p-3 transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex items-center gap-2 px-2 py-2", collapsed && "justify-center")}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Languages className="h-4 w-4" />
        </span>
        {!collapsed && (
          <span className="truncate text-base font-semibold tracking-tight">
            Learn<span className="text-primary">Y!</span>
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
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate">{t(item.labelKey)}</span>
                {item.hintKey && (
                  <span className="ml-auto text-[10px] text-muted-foreground/60">{t(item.hintKey)}</span>
                )}
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{t("How it works")}</span>}
        </button>
      </nav>

      {!collapsed && (
        <div className="border-t pt-3">
          <SyncPanel
            status={sync}
            onConnect={(id) => void connect(id)}
            onDisconnect={(id) => void disconnect(id)}
            onSyncNow={(id) => void syncNow(id)}
          />
        </div>
      )}

      <button
        type="button"
        onClick={toggleSidebar}
        className="rounded-md px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {collapsed ? t("Expand") : t("Collapse")}
      </button>

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </aside>
  );
}