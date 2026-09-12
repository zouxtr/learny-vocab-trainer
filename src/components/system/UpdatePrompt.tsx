import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  applyUpdate,
  BUILD_TIME,
  fetchRemoteVersion,
  hasUnsavedWork,
  hasWaitingWorker,
  isNewerVersion,
  nudgeUpdateCheck,
  swSupported,
} from "@/services/appUpdate";

const POLL_MS = 15 * 60 * 1000;

/**
 * Global "new version available" banner. Detects updates via a waiting
 * service worker and via a version.json mismatch (covers a stale worker),
 * on startup, tab return, window focus, and periodically. Works on desktop,
 * mobile, and installed PWAs. Never breaks the site when offline.
 */
export function UpdatePrompt() {
  const t = useT();
  const [available, setAvailable] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);
  const dismissedFor = useRef<string | null>(null);
  const reloaded = useRef(false);

  const check = useCallback(async () => {
    if (!swSupported() || document.hidden) return;
    try {
      // Nudge the browser to discover a new worker, then read both signals.
      await nudgeUpdateCheck();
      const [waiting, remote] = await Promise.all([hasWaitingWorker(), fetchRemoteVersion()]);
      const mismatch = isNewerVersion(remote, BUILD_TIME);
      if ((waiting || mismatch) && dismissedFor.current !== (remote ?? "waiting")) {
        setAvailable(true);
      }
    } catch {
      // Update checks are best effort; the app keeps working as-is.
    }
  }, []);

  useEffect(() => {
    // A fresh controller means the new worker took over → load the new UI.
    const onControl = () => {
      if (reloaded.current) return;
      reloaded.current = true;
      window.location.reload();
    };
    if (swSupported()) {
      navigator.serviceWorker.addEventListener("controllerchange", onControl);
    }
    void check();
    const onFocus = () => void check();
    const onVisible = () => {
      if (!document.hidden) void check();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void check(), POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
      if (swSupported()) {
        navigator.serviceWorker.removeEventListener("controllerchange", onControl);
      }
    };
  }, [check]);

  if (!available) return null;

  const handleUpdate = async () => {
    // Warn (don't silently discard) when an import/form holds unsaved work.
    if (hasUnsavedWork() && !confirming) {
      setConfirming(true);
      return;
    }
    setApplying(true);
    try {
      await applyUpdate();
      // "activated" path reloads via controllerchange; fall back to a timed
      // reload in case the event was missed.
      window.setTimeout(() => window.location.reload(), 4000);
    } catch {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setAvailable(false);
    setConfirming(false);
    // Stay dismissed for this version; a newer deployment re-shows.
    void fetchRemoteVersion().then((remote) => {
      dismissedFor.current = remote ?? "waiting";
    });
  };

  return (
    <div
      role="alert"
      className={cn(
        "fixed inset-x-0 bottom-0 z-[60] px-4 pb-4",
        "sm:left-auto sm:right-6 sm:w-[26rem] sm:px-0 sm:pb-6",
      )}
    >
      <div className="flex items-start gap-3 rounded-xl border border-primary/40 bg-card p-4 shadow-xl">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <RefreshCw className={cn("h-4 w-4", applying && "animate-spin")} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t("New version available.")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {confirming
              ? t("You have unsaved import progress. Update anyway?")
              : t("A new version of Learny! is ready. Update to get the latest fixes.")}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void handleUpdate()} disabled={applying}>
              {confirming ? t("Update anyway") : t("Update now")}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss} disabled={applying}>
              {t("Later")}
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={applying}
          aria-label={t("Later")}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
