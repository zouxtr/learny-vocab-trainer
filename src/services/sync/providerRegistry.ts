import type { CloudSyncProvider, ProviderId } from "@/services/sync/types";
import { DropboxProvider } from "@/services/sync/dropbox";

/**
 * In-memory map of available cloud sync providers. Adding a new provider (e.g.
 * Google Drive) requires only:
 *
 *   1. a new module implementing `CloudSyncProvider`
 *   2. registering it here
 *
 * No other part of the application needs to change.
 */
export class ProviderRegistry {
  private providers = new Map<ProviderId, CloudSyncProvider>();

  constructor() {
    this.providers.set("dropbox", new DropboxProvider());
  }

  /** Register (or replace) a provider at runtime. */
  register(provider: CloudSyncProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: ProviderId): CloudSyncProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Unknown sync provider: ${id}`);
    return provider;
  }

  list(): CloudSyncProvider[] {
    return Array.from(this.providers.values());
  }

  isConnected(id: ProviderId): boolean {
    return this.providers.get(id)?.isConnected() ?? false;
  }
}

/** Default registry used across the app. */
export const providerRegistry = new ProviderRegistry();