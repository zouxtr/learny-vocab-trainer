import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CloudUpload,
  CloudDownload,
  Plug,
  ShieldAlert,
  Unplug,
} from "lucide-react";
import { providerRegistry } from "@/services/sync/providerRegistry";
import type { ProviderId, SyncResult } from "@/services/sync/types";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SyncPanelProps {
  connected: boolean;
  uploading: boolean;
  downloading: boolean;
  uploadResult: SyncResult | null;
  downloadResult: SyncResult | null;
  lastSynced: number | null;
  remoteHasUnsyncedChanges: boolean;
  onCheckUnsyncedChanges: () => void;
  onUpload: (id: ProviderId) => void;
  onDownload: (id: ProviderId) => void;
  onDisconnect: (id: ProviderId) => void;
  onConnect: (id: ProviderId) => void;
}

/**
 * Sync controls with explicit direction. Syncing is entirely optional — with
 * no provider connected the app works fully offline and this widget simply
 * reflects that state. Both actions use an inline two-click confirmation.
 */
export function SyncPanel({
  connected,
  uploading,
  downloading,
  uploadResult,
  downloadResult,
  lastSynced,
  remoteHasUnsyncedChanges,
  onCheckUnsyncedChanges,
  onUpload,
  onDownload,
  onDisconnect,
  onConnect,
}: SyncPanelProps) {
  const provider = providerRegistry.get("dropbox");
  const t = useT();

  const [confirmDownload, setConfirmDownload] = useState(false);
  const [confirmUpload, setConfirmUpload] = useState(false);

  useEffect(() => {
    if (connected) void onCheckUnsyncedChanges();
  }, [connected, onCheckUnsyncedChanges]);

  useEffect(() => {
    setConfirmDownload(false);
    setConfirmUpload(false);
  }, [downloading, uploading]);

  useEffect(() => {
    if (!remoteHasUnsyncedChanges) setConfirmUpload(false);
  }, [remoteHasUnsyncedChanges]);

  function requestDownload() {
    if (confirmDownload) {
      setConfirmDownload(false);
      onDownload("dropbox");
    } else {
      setConfirmDownload(true);
      window.setTimeout(() => setConfirmDownload(false), 10000);
    }
  }

  function requestUpload() {
    if (remoteHasUnsyncedChanges && !confirmUpload) {
      setConfirmUpload(true);
      window.setTimeout(() => setConfirmUpload(false), 10000);
      return;
    }
    setConfirmUpload(false);
    onUpload("dropbox");
  }

  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <div className="flex items-center gap-2">
        <CloudUpload className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("Cloud sync")}
        </span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {connected
          ? t("Connected to {name}.", { name: provider.displayName })
          : t("Offline — no cloud backup.")}
      </p>

      {lastSynced && (
        <p className="mt-1 text-[11px] text-muted-foreground/80">
          {t("Last synced {time}", {
            time: new Date(lastSynced).toLocaleString(),
          })}
        </p>
      )}

      {connected && (
        <div className="mt-3 grid grid-cols-1 gap-2">
          <Button size="sm" variant="outline" onClick={requestUpload} disabled={uploading || downloading}>
            <CloudUpload className={cn("h-3.5 w-3.5", uploading && "animate-pulse")} />
            {t("Upload to Dropbox")}
          </Button>
          <Button size="sm" variant="outline" onClick={requestDownload} disabled={uploading || downloading}>
            <CloudDownload className={cn("h-3.5 w-3.5", downloading && "animate-pulse")} />
            {t("Download from Dropbox")}
          </Button>
        </div>
      )}

      {connected && remoteHasUnsyncedChanges && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-600">
          <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{t("Cloud copy has newer changes.")}</span>
        </p>
      )}

      {connected && confirmDownload && (
        <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/40 p-2.5">
          <p className="text-[11px] text-muted-foreground">
            {t("This will replace your local data with the version from Dropbox. Continue?")}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={requestDownload} disabled={downloading}>
              {t("Continue")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDownload(false)}>
              {t("Cancel")}
            </Button>
          </div>
        </div>
      )}

      {connected && confirmUpload && (
        <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/40 p-2.5">
          <p className="text-[11px] text-muted-foreground">
            {t("Uploading will overwrite unsynced changes on Dropbox. Continue?")}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={requestUpload} disabled={uploading}>
              {t("Continue")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmUpload(false)}>
              {t("Cancel")}
            </Button>
          </div>
        </div>
      )}

      {(uploadResult || downloadResult) && (
        <div className="mt-2 space-y-1">
          {[uploadResult, downloadResult]
            .filter((r): r is SyncResult => r !== null)
            .map((r) => (
              <div key={r.direction + r.message} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                {r.ok ? (
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                )}
                <span className="line-clamp-2">{t(r.message)}</span>
              </div>
            ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {connected ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDisconnect("dropbox")}
            aria-label={t("Disconnect {name}", { name: provider.displayName })}
            title={t("Disconnect {name}", { name: provider.displayName })}
          >
            <Unplug className="h-3.5 w-3.5" />
            {t("Disconnect")}
          </Button>
        ) : (
          <Button size="sm" onClick={() => onConnect("dropbox")}>
            <Plug className="h-3.5 w-3.5" />
            {t("Connect {name}", { name: provider.displayName })}
          </Button>
        )}
      </div>
    </div>
  );
}