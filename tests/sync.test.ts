import { describe, it, expect } from "vitest";
import { decideSyncAction } from "@/services/sync/syncManifest";

describe("decideSyncAction (most-recent-write-wins)", () => {
  it("pushes when there is no remote file (first upload)", () => {
    const d = decideSyncAction(false, "", null);
    expect(d.action).toBe("push");
  });

  it("pulls when the remote changed since the last sync", () => {
    const d = decideSyncAction(true, "rev-2", "rev-1");
    expect(d.action).toBe("pull");
  });

  it("pushes when remote matches the last synced revision (local authoritative)", () => {
    const d = decideSyncAction(true, "rev-1", "rev-1");
    expect(d.action).toBe("push");
  });

  it("pushes when we have never synced but a remote exists (adopt remote-less flow)", () => {
    const d = decideSyncAction(true, "rev-9", null);
    expect(d.action).toBe("push");
  });

  it("treats an empty remote revision as no remote", () => {
    const d = decideSyncAction(false, "", "rev-1");
    expect(d.action).toBe("push");
  });
});