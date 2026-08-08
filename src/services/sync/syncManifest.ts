import type { ProviderId } from "@/services/sync/types";

export const MANIFEST_KEY = (id: ProviderId) => `learny.sync.${id}.manifest`;

/** The action a sync should take, given the current state. */
export interface SyncDecision {
  action: "push" | "pull" | "noop";
  reason: string;
}

export interface SyncManifest {
  lastSyncedRev: string;
  lastSyncedAt: number;
  fileSize: number;
}

export function loadManifest(id: ProviderId): SyncManifest | null {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY(id));
    return raw ? (JSON.parse(raw) as SyncManifest) : null;
  } catch {
    return null;
  }
}

export function saveManifest(id: ProviderId, m: SyncManifest): void {
  localStorage.setItem(MANIFEST_KEY(id), JSON.stringify(m));
}

/**
 * Decide what to do for a single sync pass using most-recent-write-wins.
 *
 * Pure decision logic, unit-testable without a database or network.
 *
 * @param hasRemote      whether a remote copy exists on the cloud
 * @param remoteRev      the provider's revision of the remote file ("" if none)
 * @param lastSyncedRev  the revision we last successfully synced (null if never)
 */
export function decideSyncAction(
  hasRemote: boolean,
  remoteRev: string,
  lastSyncedRev: string | null,
): SyncDecision {
  if (!hasRemote) return { action: "push", reason: "no remote exists yet" };

  if (lastSyncedRev && remoteRev !== lastSyncedRev) {
    return { action: "pull", reason: "remote changed since last sync" };
  }

  return { action: "push", reason: "local is authoritative" };
}