/**
 * Cloud sync provider contract.
 *
 * A provider encapsulates everything needed to store the app's SQLite database
 * file in a user-owned cloud storage account, using OAuth to authorize access
 * from the browser with no server or app-level account of our own.
 *
 * The interface is deliberately small so a new provider (e.g. Google Drive)
 * can be added by implementing these four methods and registering it in the
 * provider registry — no other part of the app needs to know the specifics.
 */
export interface RemoteFile {
  /** File content as raw bytes. */
  bytes: Uint8Array;
  /** Provider-specific revision identifier (used for change detection). */
  rev: string;
  /** Provider-reported last modified time, ms since epoch. */
  modifiedAt: number;
}

export interface CloudSyncProvider {
  readonly id: ProviderId;
  readonly displayName: string;

  /** Whether the user is currently authenticated and authorized. */
  isConnected(): boolean;

  /**
   * Begin the OAuth flow so the user grants access. Resolves once fully
   * authenticated (and the auth token is persisted by the provider).
   */
  connect(): Promise<void>;

  /** Revoke access and clear locally stored credentials. */
  disconnect(): Promise<void>;

  /** Fetch the app database file from the cloud, or `null` if absent. */
  getFile(): Promise<RemoteFile | null>;

  /**
   * Upload the database file to the cloud.
   *
   * @param bytes  serialized database content
   * @param rev    the remote revision to overwrite, if known; `""` to overwrite
   *               whatever is currently there (used by last-write-wins).
   */
  putFile(bytes: Uint8Array, rev?: string): Promise<{ rev: string; modifiedAt: number }>;
}

/** Union of provider identifiers supported by the registry. */
export type ProviderId = "dropbox" | "googledrive";

export interface SyncProviderConfig {
  dropbox?: {
    /** Dropbox app key for the browser PKCE flow. */
    clientKey: string;
    /** Dropbox app folder, e.g. "/apps/learny". */
    appFolder: string;
  };
}

/** Result of a manual sync attempt, surfaced to the UI. */
export interface SyncResult {
  ok: boolean;
  provider: ProviderId;
  direction: "push" | "pull" | "noop";
  message: string;
  remoteRev?: string;
  bytesTransferred?: number;
}