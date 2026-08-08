import type { CloudSyncProvider, RemoteFile } from "@/services/sync/types";
import { DropboxClient, connectDropboxAccount, type DropboxTokens } from "@/services/sync/dropbox/api";

/** Where refresh/access tokens are kept. Optionally encrypted in the future. */
const TOKEN_STORAGE_KEY = "learny.sync.dropbox.tokens";

const APP_FOLDER =
  (import.meta.env.VITE_DROPBOX_APP_FOLDER as string | undefined) || "/apps/learny";

function loadTokens(): DropboxTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DropboxTokens) : null;
  } catch {
    return null;
  }
}

function saveTokens(tokens: DropboxTokens): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

/**
 * Dropbox implementation of `CloudSyncProvider`, storing the app's database
 * file in the user's dedicated Dropbox app folder.
 */
export class DropboxProvider implements CloudSyncProvider {
  readonly id = "dropbox" as const;
  readonly displayName = "Dropbox";

  private tokens: DropboxTokens | null;

  constructor() {
    this.tokens = loadTokens();
  }

  isConnected(): boolean {
    return !!this.tokens?.refreshToken;
  }

  async connect(): Promise<void> {
    this.tokens = await connectDropboxAccount();
    saveTokens(this.tokens);
  }

  async disconnect(): Promise<void> {
    // Fire-and-forget revoke is acceptable here; clearing local creds is the
    // important, synchronous part.
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    this.tokens = null;
  }

  private client(): DropboxClient {
    if (!this.tokens?.refreshToken) throw new Error("Dropbox is not connected");
    return new DropboxClient(this.tokens, APP_FOLDER, (t) => saveTokens(t));
  }

  async getFile(): Promise<RemoteFile | null> {
    const meta = await this.client().getMetadata();
    if (!meta) return null;
    const file = await this.client().download();
    return { bytes: file.bytes, rev: meta.rev || file.rev, modifiedAt: meta.modifiedAt };
  }

  async putFile(bytes: Uint8Array, _rev?: string): Promise<{ rev: string; modifiedAt: number }> {
    return this.client().upload(bytes);
  }
}