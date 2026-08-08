import type { CloudSyncProvider, RemoteFile } from "@/services/sync/types";

/**
 * Google Drive provider — NOT YET IMPLEMENTED.
 *
 * This file documents the shape a future provider takes. Implementing it
 * involves the Google Identity Services (PKCE, `scope=drive.appdata` or an
 * app-specific folder) and the Drive v3 Files API. No changes to the sync
 * service, UI, or database layer are required beyond registering the provider
 * in `providerRegistry.ts`.
 */
export class GoogleDriveProvider implements CloudSyncProvider {
  readonly id = "googledrive" as const;
  readonly displayName = "Google Drive";

  isConnected(): boolean {
    return false;
  }

  async connect(): Promise<void> {
    throw new Error("Google Drive provider is not implemented yet");
  }

  async disconnect(): Promise<void> {
    throw new Error("Google Drive provider is not implemented yet");
  }

  async getFile(): Promise<RemoteFile | null> {
    throw new Error("Google Drive provider is not implemented yet");
  }

  async putFile(_bytes: Uint8Array, _rev?: string): Promise<{ rev: string; modifiedAt: number }> {
    throw new Error("Google Drive provider is not implemented yet");
  }
}