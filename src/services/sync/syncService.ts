import { dbExport, initDatabase, loadDatabase } from "@/services/database";
import { providerRegistry } from "@/services/sync/providerRegistry";
import { decideSyncAction, loadManifest, saveManifest } from "@/services/sync/syncManifest";
import type { ProviderId, SyncResult } from "@/services/sync/types";

export { decideSyncAction } from "@/services/sync/syncManifest";
export type { SyncManifest } from "@/services/sync/syncManifest";

/**
 * Orchestrate a "Sync now" for a single provider using a simple
 * most-recent-write-wins strategy (single-user app, no merge logic).
 *
 *   1. No remote file yet → push the local database.
 *   2. Remote revision differs from what we last synced → pull the remote down.
 *   3. Otherwise the local DB is authoritative → push it.
 *
 * The manifest tracks the last revision we successfully synced so external
 * changes can be detected on the next run.
 *
 * NOTE: Cloud sync is entirely optional. The app (including study sessions,
 * imports and all CRUD) works fully offline with no provider connected — this
 * function simply returns a friendly "not connected" result when invoked
 * without a connection, and nothing else in the app requires a connection.
 */
export async function syncNow(provider: ProviderId): Promise<SyncResult> {
  const p = providerRegistry.get(provider);

  if (!p.isConnected()) {
    return { ok: false, provider, direction: "noop", message: "Not connected. Connect to sync first." };
  }

  try {
    await initDatabase();

    const remote = await p.getFile();
    const localBytes = dbExport();
    const manifest = loadManifest(provider);

    const decision = decideSyncAction(!!remote, remote?.rev ?? "", manifest?.lastSyncedRev ?? null);

    if (decision.action === "pull" && remote) {
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
    }

    // push (or first-ever push when remote was absent)
    const uploaded = await p.putFile(localBytes, remote?.rev);
    saveManifest(provider, {
      lastSyncedRev: uploaded.rev,
      lastSyncedAt: uploaded.modifiedAt,
      fileSize: localBytes.byteLength,
    });
    return {
      ok: true,
      provider,
      direction: "push",
      message: remote ? "Pushed your latest changes" : "Uploaded your database to the cloud",
      remoteRev: uploaded.rev,
      bytesTransferred: localBytes.byteLength,
    };
  } catch (e) {
    return {
      ok: false,
      provider,
      direction: "noop",
      message: e instanceof Error ? e.message : "Sync failed",
    };
  }
}