import { dbExport, initDatabase, loadDatabase } from "@/services/database";
import { providerRegistry } from "@/services/sync/providerRegistry";
import { loadManifest, saveManifest } from "@/services/sync/syncManifest";
import type { CloudSyncProvider, ProviderId, SyncResult } from "@/services/sync/types";

export type { SyncManifest } from "@/services/sync/syncManifest";

/**
 * Cloud sync with explicit direction. There is no automatic direction
 * guessing: the user picks "Upload" (local → Dropbox) or "Download"
 * (Dropbox → local) every time.
 *
 * NOTE: Cloud sync is entirely optional. The app (including study sessions,
 * imports and all CRUD) works fully offline with no provider connected — these
 * functions return a friendly "not connected" result when invoked without a
 * connection, and nothing else in the app requires a connection.
 */

function notConnected(provider: ProviderId): SyncResult {
  return { ok: false, provider, direction: "noop", message: "Not connected. Connect to sync first." };
}

/**
 * Whether the remote file has changes we haven't pulled yet. Used to warn
 * before an upload would overwrite unsynced remote work. Never throws: a
 * problem probing the remote just means "no warning needed".
 */
export async function hasUnsyncedRemoteChanges(provider: ProviderId): Promise<boolean> {
  const p = providerRegistry.get(provider);
  if (!p.isConnected()) return false;
  try {
    const remote = await p.getFile();
    if (!remote) return false;
    const manifest = loadManifest(provider);
    if (!manifest?.lastSyncedRev) return true; // never synced but remote exists
    return remote.rev !== manifest.lastSyncedRev;
  } catch {
    return false;
  }
}

/**
 * Always push the local database to Dropbox, overwriting whatever is there.
 * No revision/timestamp comparison — local is pushed, full stop.
 */
export async function uploadToDropbox(): Promise<SyncResult> {
  const provider: ProviderId = "dropbox";
  const p: CloudSyncProvider = providerRegistry.get(provider);

  if (!p.isConnected()) return notConnected(provider);

  try {
    await initDatabase();
    const localBytes = dbExport();

    const uploaded = await p.putFile(localBytes, "");
    saveManifest(provider, {
      lastSyncedRev: uploaded.rev,
      lastSyncedAt: uploaded.modifiedAt,
      fileSize: localBytes.byteLength,
    });
    return {
      ok: true,
      provider,
      direction: "push",
      message: "Uploaded your database to Dropbox",
      remoteRev: uploaded.rev,
      bytesTransferred: localBytes.byteLength,
    };
  } catch (e) {
    return {
      ok: false,
      provider,
      direction: "noop",
      message: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

/**
 * Always pull the file from Dropbox and replace the local database with it.
 * No revision/timestamp comparison — remote is pulled, full stop. Returns a
 * clear error when there is no remote file to download yet.
 */
export async function downloadFromDropbox(): Promise<SyncResult> {
  const provider: ProviderId = "dropbox";
  const p: CloudSyncProvider = providerRegistry.get(provider);

  if (!p.isConnected()) return notConnected(provider);

  try {
    await initDatabase();
    const remote = await p.getFile();
    if (!remote) {
      return {
        ok: false,
        provider,
        direction: "noop",
        message: "Nothing to download yet — no file found on Dropbox.",
      };
    }

    await loadDatabase(remote.bytes);
    saveManifest(provider, {
      lastSyncedRev: remote.rev,
      lastSyncedAt: remote.modifiedAt,
      fileSize: remote.bytes.byteLength,
    });
    return {
      ok: true,
      provider,
      direction: "pull",
      message: "Downloaded the latest version from the cloud",
      remoteRev: remote.rev,
      bytesTransferred: remote.bytes.byteLength,
    };
  } catch (e) {
    return {
      ok: false,
      provider,
      direction: "noop",
      message: e instanceof Error ? e.message : "Download failed",
    };
  }
}