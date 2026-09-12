/**
 * In-app update detection for the Learny! PWA.
 *
 * Two independent signals feed the UpdatePrompt banner:
 * 1. A waiting service worker (prompt-type registration — the new worker
 *    sits in `waiting` until the user applies it).
 * 2. A `version.json` mismatch: the file is generated per build and fetched
 *    with `cache: "no-store"` (never SW-precached), so it reveals a newer
 *    deployment even when the controlling worker itself is stale.
 *
 * Everything here fails soft: no service worker (dev), no network, or a
 * malformed version.json simply means "no update known" — the site keeps
 * working untouched.
 */

/** Build timestamp of the currently running bundle (injected at build). */
export const BUILD_TIME: string = typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "dev";

/** True when the fetched deployment version differs from the running one. */
export function isNewerVersion(remote: string | null | undefined, local: string = BUILD_TIME): boolean {
  if (!remote || typeof remote !== "string") return false;
  const r = remote.trim();
  if (!r || r === "dev") return false;
  if (local === "dev") return false;
  return r !== local.trim();
}

/** Fetch the deployed version, or `null` on any failure (offline, 404…). */
export async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: unknown };
    return typeof data.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

export function swSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/** The active registration, or `null` when unsupported / not registered. */
export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (!swSupported()) return null;
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

/** Whether a new worker is installed and waiting to be applied. */
export async function hasWaitingWorker(): Promise<boolean> {
  const reg = await getRegistration();
  return reg?.waiting != null;
}

/** Ask the browser to look for a new worker right now. Never throws. */
export async function nudgeUpdateCheck(): Promise<void> {
  try {
    await (await getRegistration())?.update();
  } catch {
    // Best effort only.
  }
}

/**
 * Apply the update and reload onto the new version:
 * - waiting worker → SKIP_WAITING (caller reloads on `controllerchange`);
 * - otherwise (wedged/stale worker) → unregister everything and reload, so
 *   the browser boots the new bundle + worker cleanly from the network.
 */
export async function applyUpdate(): Promise<"activated" | "reloaded"> {
  const reg = await getRegistration();
  if (reg?.waiting) {
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
    return "activated";
  }
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
  } catch {
    // Fall through to the reload regardless.
  }
  window.location.reload();
  return "reloaded";
}

/* ------------------------------------------------------------------ *
 * Unsaved-work guard: dialogs with uncommitted user input register here
 * so the banner can warn instead of silently discarding their work.
 * ------------------------------------------------------------------ */

const holders = new Set<string>();

/** Mark `key` (e.g. "import") as holding unsaved user work or clear it. */
export function setUnsavedWork(key: string, holds: boolean): void {
  if (holds) holders.add(key);
  else holders.delete(key);
}

/** Whether any surface currently holds unsaved user work. */
export function hasUnsavedWork(): boolean {
  return holders.size > 0;
}
