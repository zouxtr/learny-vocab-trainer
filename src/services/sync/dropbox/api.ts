import { authorizeWithPopup, randomString } from "@/services/sync/oauth";

const AUTH_URL = "https://www.dropbox.com/oauth2/authorize";
const TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";
const API_URL = "https://api.dropboxapi.com/2";
const CONTENT_URL = "https://content.dropboxapi.com/2";

export interface DropboxTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds at which accessToken expires. */
  expiresAt: number;
}

/** Dropbox app key for the browser PKCE flow (public by design). */
const CLIENT_KEY = import.meta.env.VITE_DROPBOX_CLIENT_KEY as string | undefined;

/**
 * Minimal Dropbox API client covering only the Files endpoints the app needs
 * (metadata, download, upload) plus automatic access-token refresh. Kept
 * dependency-free and small so it stays swappable behind `CloudSyncProvider`.
 */
export class DropboxClient {
  private tokens: DropboxTokens;

  constructor(
    tokens: DropboxTokens,
    private readonly appFolder: string,
    private readonly onTokensChanged?: (t: DropboxTokens) => void,
  ) {
    this.tokens = tokens;
  }

  /** Full cloud path of the database file inside the app folder. */
  private get filePath(): string {
    return `${this.appFolder}/learny.sqlite`;
  }

  private async accessToken(): Promise<string> {
    if (this.tokens.expiresAt > Date.now() / 1000 + 60) return this.tokens.accessToken;
    return this.refreshTokens();
  }

  private async refreshTokens(): Promise<string> {
    if (!CLIENT_KEY) throw new Error("Dropbox client key not configured");
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.tokens.refreshToken,
      client_id: CLIENT_KEY,
    });
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`Dropbox token refresh failed (${res.status})`);
    const data = await res.json();
    this.tokens.accessToken = data.access_token;
    this.tokens.expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in ?? 14400);
    this.onTokensChanged?.(this.tokens);
    return this.tokens.accessToken;
  }

  /** Metadata for the DB file, or null when it does not exist yet. */
  async getMetadata(): Promise<{ rev: string; modifiedAt: number } | null> {
    const token = await this.accessToken();
    const res = await fetch(`${API_URL}/files/get_metadata`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ path: this.filePath }),
    });
    if (res.status === 409) {
      const body = (await res.json().catch(() => null)) as { error_summary?: string } | null;
      const summary = body?.error_summary ?? "";
      if (summary.includes("not_found")) return null;
      throw new Error(`Dropbox metadata error: ${summary}`);
    }
    if (!res.ok) throw new Error(`Dropbox metadata failed (${res.status})`);
    const data = (await res.json()) as { rev: string; client_modified?: string; server_modified?: string };
    return {
      rev: data.rev,
      modifiedAt: Date.parse(data.client_modified ?? data.server_modified ?? "") || Date.now(),
    };
  }

  /** Download the file bytes. */
  async download(): Promise<{ bytes: Uint8Array; rev: string; modifiedAt: number }> {
    const token = await this.accessToken();
    const res = await fetch(`${CONTENT_URL}/files/download`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({ path: this.filePath }),
      },
    });
    if (!res.ok) throw new Error(`Dropbox download failed (${res.status})`);
    const arg = res.headers.get("dropbox-api-result") ?? "";
    let rev = "";
    let modifiedAt = Date.now();
    try {
      const meta = JSON.parse(arg) as { rev?: string; server_modified?: string };
      rev = meta.rev ?? "";
      modifiedAt = Date.parse(meta.server_modified ?? "") || Date.now();
    } catch {
      // ignore malformed header
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { bytes, rev, modifiedAt };
  }

  /** Upload the file bytes (overwrite). Returns the resulting revision. */
  async upload(bytes: Uint8Array): Promise<{ rev: string; modifiedAt: number }> {
    const token = await this.accessToken();
    const res = await fetch(`${CONTENT_URL}/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: this.filePath,
          mode: "overwrite",
          autorename: false,
          mute: true,
        }),
      },
      body: bytes,
    });
    if (!res.ok) throw new Error(`Dropbox upload failed (${res.status})`);
    const data = (await res.json()) as { rev: string; server_modified?: string };
    return { rev: data.rev, modifiedAt: Date.parse(data.server_modified ?? "") || Date.now() };
  }
}

/** Drive the PKCE authorize + token exchange. Returns tokens to persist. */
export async function connectDropboxAccount(): Promise<DropboxTokens> {
  if (!CLIENT_KEY) throw new Error("Dropbox client key not configured (VITE_DROPBOX_CLIENT_KEY)");
  const verifier = await randomString(64);
  const redirectUri = `${window.location.origin}`;

  const code = await authorizeWithPopup(
    (challenge) => {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_KEY,
        code_challenge: challenge,
        code_challenge_method: "S256",
        token_access_type: "offline",
        redirect_uri: redirectUri,
      });
      return `${AUTH_URL}?${params.toString()}`;
    },
    verifier,
  );

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: CLIENT_KEY,
    code_verifier: verifier,
    redirect_uri: redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Dropbox token exchange failed (${res.status})`);
  const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Dropbox did not return an access token");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 14400),
  };
}