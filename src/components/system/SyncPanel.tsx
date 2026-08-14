import { AlertCircle, Check, CloudUpload, Loader2, Plug, Unplug, RefreshCw } from "lucide-react";
import { providerRegistry } from "@/services/sync/providerRegistry";
import type { ProviderId, SyncResult } from "@/services/sync/types";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SyncStatus {
  connected: boolean;
  syncing: boolean;
  lastResult: SyncResult | null;
}

interface SyncPanelProps {
  status: SyncStatus;
  onSyncNow: (id: ProviderId) => void;
  onDisconnect: (id: ProviderId) => void;
  onConnect: (id: ProviderId) => void;
}

/**
 * Sync controls. Syncing is entirely optional — with no provider connected the
 * app works fully offline and this widget simply reflects that state.
 */
export function SyncPanel({ status: sync, onSyncNow, onDisconnect, onConnect }: SyncPanelProps) {
  const provider = providerRegistry.get("dropbox");
  const t = useT();

  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <div className="flex items-center gap-2">
        <CloudUpload className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("Cloud sync")}
        </span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {sync.connected
          ? t("Connected to {name}.", { name: provider.displayName })
          : t("Offline — no cloud backup.")}
      </p>

      {sync.lastResult && (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          {sync.lastResult.ok ? (
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
          )}
          <span className="line-clamp-2">{sync.lastResult.message}</span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {sync.connected ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSyncNow("dropbox")}
              disabled={sync.syncing}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", sync.syncing && "animate-spin")} />
              {t("Sync now")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDisconnect("dropbox")}
              aria-label={t("Disconnect {name}", { name: provider.displayName })}
              title={t("Disconnect {name}", { name: provider.displayName })}
            >
              <Unplug className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => onConnect("dropbox")}>
            {sync.syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5" />
            )}
            {t("Connect {name}", { name: provider.displayName })}
          </Button>
        )}
      </div>
    </div>
  );
}