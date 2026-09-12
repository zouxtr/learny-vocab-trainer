import { describe, it, expect } from "vitest";
import { isNewerVersion, setUnsavedWork, hasUnsavedWork } from "../src/services/appUpdate";

describe("isNewerVersion", () => {
  it("detects a changed deployment version", () => {
    expect(isNewerVersion("2026-09-12T02:00:00.000Z", "2026-09-12T01:00:00.000Z")).toBe(true);
  });

  it("reports same version as current", () => {
    expect(isNewerVersion("2026-09-12T01:00:00.000Z", "2026-09-12T01:00:00.000Z")).toBe(false);
  });

  it("treats missing, empty, dev, and non-string versions as not-new", () => {
    expect(isNewerVersion(null, "2026-09-12T01:00:00.000Z")).toBe(false);
    expect(isNewerVersion(undefined, "2026-09-12T01:00:00.000Z")).toBe(false);
    expect(isNewerVersion("", "2026-09-12T01:00:00.000Z")).toBe(false);
    expect(isNewerVersion("dev", "2026-09-12T01:00:00.000Z")).toBe(false);
    expect(isNewerVersion("2026-09-12T02:00:00.000Z", "dev")).toBe(false);
  });
});

describe("unsaved-work guard", () => {
  it("tracks holders by key", () => {
    setUnsavedWork("import", false);
    expect(hasUnsavedWork()).toBe(false);
    setUnsavedWork("import", true);
    expect(hasUnsavedWork()).toBe(true);
    setUnsavedWork("import", false);
    expect(hasUnsavedWork()).toBe(false);
  });
});
