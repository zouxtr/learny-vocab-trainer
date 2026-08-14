import { describe, it, expect, beforeEach, vi } from "vitest";
import type { CloudSyncProvider, RemoteFile } from "@/services/sync/types";
import { providerRegistry } from "@/services/sync/providerRegistry";
import {
  hasUnsyncedRemoteChanges,
  uploadToDropbox,
  downloadFromDropbox,
} from "@/services/sync/syncService";
import type { SyncManifest } from "@/services/sync/syncManifest";

vi.mock("@/services/database", () => ({
  initDatabase: vi.fn(async () => ({})),
  dbExport: vi.fn(() => new Uint8Array([1, 2, 3])),
  loadDatabase: vi.fn(async () => {}),
}));

vi.mock("@/services/sync/syncManifest", () => {
  const loadManifest = vi.fn();
  const saveManifest = vi.fn();
  return { loadManifest, saveManifest };
});

import { dbExport, loadDatabase } from "@/services/database";
import { loadManifest, saveManifest } from "@/services/sync/syncManifest";

const mockedLoadManifest = vi.mocked(loadManifest);
const mockedSaveManifest = vi.mocked(saveManifest);
const mockedDbExport = vi.mocked(dbExport);
const mockedLoadDatabase = vi.mocked(loadDatabase);

function makeProvider(overrides: Partial<CloudSyncProvider> = {}): CloudSyncProvider {
  const base: CloudSyncProvider = {
    id: "dropbox",
    displayName: "FakeDropbox",
    isConnected: () => true,
    connect: async () => {},
    disconnect: async () => {},
    getFile: async () => null,
    putFile: async (_bytes, _rev) => ({ rev: "remote-rev-1", modifiedAt: 111 }),
  };
  return { ...base, ...overrides };
}

const remoteFile: RemoteFile = { bytes: new Uint8Array([9, 9]), rev: "r2", modifiedAt: 222 };

function register(provider: CloudSyncProvider): void {
  providerRegistry.register(provider);
}

describe("hasUnsyncedRemoteChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedLoadManifest.mockReturnValue(null);
  });

  it("returns false when not connected", async () => {
    register(makeProvider({ isConnected: () => false }));
    expect(await hasUnsyncedRemoteChanges("dropbox")).toBe(false);
  });

  it("returns false when there is no remote file", async () => {
    register(makeProvider({ getFile: async () => null }));
    expect(await hasUnsyncedRemoteChanges("dropbox")).toBe(false);
  });

  it("returns true when a remote exists but we never synced", async () => {
    register(makeProvider({ getFile: async () => remoteFile }));
    expect(await hasUnsyncedRemoteChanges("dropbox")).toBe(true);
  });

  it("returns false when remote matches our last synced revision", async () => {
    register(makeProvider({ getFile: async () => remoteFile }));
    mockedLoadManifest.mockReturnValue({ lastSyncedRev: "r2" } as SyncManifest);
    expect(await hasUnsyncedRemoteChanges("dropbox")).toBe(false);
  });

  it("returns true when remote differs from our last synced revision", async () => {
    register(makeProvider({ getFile: async () => remoteFile }));
    mockedLoadManifest.mockReturnValue({ lastSyncedRev: "old-rev" } as SyncManifest);
    expect(await hasUnsyncedRemoteChanges("dropbox")).toBe(true);
  });

  it("returns false (no warning) when probing the remote fails", async () => {
    register(makeProvider({ getFile: async () => Promise.reject(new Error("offline")) }));
    expect(await hasUnsyncedRemoteChanges("dropbox")).toBe(false);
  });
});

describe("uploadToDropbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a noop when not connected", async () => {
    register(makeProvider({ isConnected: () => false }));
    const r = await uploadToDropbox();
    expect(r.ok).toBe(false);
    expect(r.direction).toBe("noop");
    expect(mockedDbExport).not.toHaveBeenCalled();
  });

  it("pushes local bytes unconditionally and records the new revision", async () => {
    const putFile = vi.fn(async (_bytes: Uint8Array, _rev?: string) => ({
      rev: "new-rev",
      modifiedAt: 333,
    }));
    register(makeProvider({ putFile }));
    mockedDbExport.mockReturnValue(new Uint8Array([5, 6, 7]));

    const r = await uploadToDropbox();

    expect(r.ok).toBe(true);
    expect(r.direction).toBe("push");
    expect(putFile).toHaveBeenCalledTimes(1);
    expect(putFile).toHaveBeenCalledWith(new Uint8Array([5, 6, 7]), "");
    expect(mockedSaveManifest).toHaveBeenCalledWith("dropbox", {
      lastSyncedRev: "new-rev",
      lastSyncedAt: 333,
      fileSize: 3,
    });
  });

  it("reports an upload failure", async () => {
    register(makeProvider({ putFile: async () => Promise.reject(new Error("quota exceeded")) }));
    const r = await uploadToDropbox();
    expect(r.ok).toBe(false);
    expect(r.message).toBe("quota exceeded");
  });
});

describe("downloadFromDropbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a noop when not connected", async () => {
    register(makeProvider({ isConnected: () => false }));
    const r = await downloadFromDropbox();
    expect(r.ok).toBe(false);
    expect(r.direction).toBe("noop");
    expect(mockedLoadDatabase).not.toHaveBeenCalled();
  });

  it("errors when there is no remote file yet", async () => {
    register(makeProvider({ getFile: async () => null }));
    const r = await downloadFromDropbox();
    expect(r.ok).toBe(false);
    expect(r.message).toContain("Nothing to download yet");
    expect(mockedLoadDatabase).not.toHaveBeenCalled();
  });

  it("replaces the local database with the remote bytes and records the revision", async () => {
    register(makeProvider({ getFile: async () => remoteFile }));
    const r = await downloadFromDropbox();

    expect(r.ok).toBe(true);
    expect(r.direction).toBe("pull");
    expect(mockedLoadDatabase).toHaveBeenCalledTimes(1);
    expect(mockedLoadDatabase).toHaveBeenCalledWith(remoteFile.bytes);
    expect(mockedSaveManifest).toHaveBeenCalledWith("dropbox", {
      lastSyncedRev: "r2",
      lastSyncedAt: 222,
      fileSize: 2,
    });
  });

  it("reports a download failure", async () => {
    register(makeProvider({ getFile: async () => Promise.reject(new Error("network down")) }));
    const r = await downloadFromDropbox();
    expect(r.ok).toBe(false);
    expect(r.message).toBe("network down");
  });
});