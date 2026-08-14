import { create } from "zustand";
import { providerRegistry } from "@/services/sync/providerRegistry";
import { loadManifest } from "@/services/sync/syncManifest";
import { downloadFromDropbox, hasUnsyncedRemoteChanges, uploadToDropbox } from "@/services/sync/syncService";
import type { ProviderId, SyncResult } from "@/services/sync/types";
import { useDictionaryStore } from "@/stores/dictionaryStore";
import { useStudyStore } from "@/stores/studyStore";

export interface SyncState {
  connected: boolean;
  uploading: boolean;
  downloading: boolean;
  uploadResult: SyncResult | null;
  downloadResult: SyncResult | null;
  lastSynced: number | null;
  remoteHasUnsyncedChanges: boolean;
  checkUnsyncedChanges: () => Promise<void>;
  connect: (provider: ProviderId) => Promise<void>;
  disconnect: (provider: ProviderId) => Promise<void>;
  upload: () => Promise<void>;
  download: () => Promise<void>;
}

function refreshConnected(): boolean {
  return providerRegistry.isConnected("dropbox");
}

function refreshLastSynced(): number | null {
  const manifest = loadManifest("dropbox");
  return manifest?.lastSyncedAt ?? null;
}

export const useSyncStore = create<SyncState>()((set) => ({
  connected: refreshConnected(),
  uploading: false,
  downloading: false,
  uploadResult: null,
  downloadResult: null,
  lastSynced: refreshLastSynced(),
  remoteHasUnsyncedChanges: false,

  checkUnsyncedChanges: async () => {
    set({ remoteHasUnsyncedChanges: await hasUnsyncedRemoteChanges("dropbox") });
  },

  connect: async (provider) => {
    try {
      await providerRegistry.get(provider).connect();
      set({ connected: refreshConnected() });
    } catch (e) {
      set({
        connected: refreshConnected(),
        downloadResult: {
          ok: false,
          provider,
          direction: "noop",
          message: e instanceof Error ? e.message : "Failed to connect",
        },
      });
    }
  },

  disconnect: async (provider) => {
    await providerRegistry.get(provider).disconnect();
    set({ connected: refreshConnected(), uploadResult: null, downloadResult: null });
  },

  upload: async () => {
    set({ uploading: true });
    const result = await uploadToDropbox();
    set({
      uploading: false,
      connected: refreshConnected(),
      uploadResult: result,
      lastSynced: refreshLastSynced(),
      remoteHasUnsyncedChanges: false,
    });
  },

  download: async () => {
    set({ downloading: true });
    const result = await downloadFromDropbox();
    if (result.ok) {
      await useDictionaryStore.getState().refresh();
      useStudyStore.getState().reset();
    }
    set({
      downloading: false,
      connected: refreshConnected(),
      downloadResult: result,
      lastSynced: refreshLastSynced(),
      remoteHasUnsyncedChanges: false,
    });
  },
}));