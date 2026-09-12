import { useEffect, useState } from "react";
import { Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/uiStore";
import { useT } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** True when the page already runs as an installed PWA. */
function isInstalled(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari standalone flag (not typed in lib.dom).
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  return false;
}

/**
 * Mobile-only "add to home screen" suggestion on the home page. Shows a
 * native Install button when the browser offers one (Android Chrome via
 * `beforeinstallprompt`), plus short manual steps for Android and iOS.
 * Hidden once installed or dismissed (persisted per device).
 */
export function InstallPrompt() {
  const t = useT();
  const dismissed = useUiStore((s) => s.installPromptDismissed);
  const dismiss = useUiStore((s) => s.dismissInstallPrompt);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isInstalled);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    const media = window.matchMedia("(display-mode: standalone)");
    const onDisplay = () => setInstalled(isInstalled());
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    media.addEventListener("change", onDisplay);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      media.removeEventListener("change", onDisplay);
    };
  }, []);

  if (dismissed || installed) return null;

  const handleInstall = async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      setDeferred(null);
      setInstalling(false);
    }
  };

  return (
    <section className="rounded-xl border-2 border-primary bg-gradient-to-br from-primary/15 via-card to-card p-4 shadow-md md:hidden">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">{t("Install Learny! as an app")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("Add it to your home screen for fullscreen studying and offline access.")}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("Dismiss")}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {deferred && (
        <Button size="sm" className="mt-3 w-full" onClick={() => void handleInstall()} disabled={installing}>
          {t("Install app")}
        </Button>
      )}

      <div className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">{t("Android:")} </span>
          {t("Tap the browser menu (⋮), then “Add to Home screen” or “Install app”.")}
        </p>
        <p>
          <span className="font-semibold text-foreground">{t("iPhone / iPad:")} </span>
          {t("Tap the Share button, then “Add to Home Screen”.")}
          <Share className="ml-1 inline h-3.5 w-3.5" />
        </p>
      </div>
    </section>
  );
}
