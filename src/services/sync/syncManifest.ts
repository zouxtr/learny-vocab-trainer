import type { ProviderId } from "@/services/sync/types";

export const MANIFEST_KEY = (id: ProviderId) => `learny.sync.${id}.manifest`;

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
