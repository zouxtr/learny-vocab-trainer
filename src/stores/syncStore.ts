import { create } from "zustand";
import { providerRegistry } from "@/services/sync/providerRegistry";
import { syncNow } from "@/services/sync/syncService";
import type { ProviderId, SyncResult } from "@/services/sync/types";

export interface SyncState {
  connected: boolean;
  syncing: boolean;
  lastResult: SyncResult | null;
  connect: (provider: ProviderId) => Promise<void>;
  disconnect: (provider: ProviderId) => Promise<void>;
  syncNow: (provider: ProviderId) => Promise<void>;
}

function refreshConnected(): boolean {
  return providerRegistry.isConnected("dropbox");
}

export const useSyncStore = create<SyncState>()((set) => ({
  connected: refreshConnected(),
  syncing: false,
  lastResult: null,

  connect: async (provider) => {
    set({ syncing: true });
    try {
      await providerRegistry.get(provider).connect();
      set({ connected: refreshConnected(), syncing: false });
    } catch (e) {
      set({
        syncing: false,
        connected: refreshConnected(),
        lastResult: {
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
    set({ connected: refreshConnected(), lastResult: null });
  },

  syncNow: async (provider) => {
    set({ syncing: true });
    const result = await syncNow(provider);
    set({ syncing: false, connected: refreshConnected(), lastResult: result });
  },
}));