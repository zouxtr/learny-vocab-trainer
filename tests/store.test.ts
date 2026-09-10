import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseStoreLine,
  parseStoreText,
  fetchStoreEntries,
  clearStoreCache,
  STORE_FILE_URL,
} from "../src/services/store";

afterEach(() => {
  clearStoreCache();
  vi.unstubAllGlobals();
});

describe("parseStoreLine", () => {
  it("parses a plain six-field line", () => {
    expect(
      parseStoreLine("German basics, DE, BG, https://example.com/w.tsv, tsv, Jane"),
    ).toEqual({
      name: "German basics",
      sourceLanguage: "de",
      targetLanguage: "bg",
      link: "https://example.com/w.tsv",
      linkType: "tsv",
      author: "Jane",
    });
  });

  it("handles quoted names containing commas and case-insensitive codes", () => {
    expect(
      parseStoreLine('"German basics, A1", EN, DE, https://x.test/s, SHEET, Ivan'),
    ).toEqual({
      name: "German basics, A1",
      sourceLanguage: "en",
      targetLanguage: "de",
      link: "https://x.test/s",
      linkType: "sheet",
      author: "Ivan",
    });
  });

  it("rejects comments, blanks, wrong field counts, bad codes, and bad types", () => {
    expect(parseStoreLine("# comment")).toBeNull();
    expect(parseStoreLine("   ")).toBeNull();
    expect(parseStoreLine("a, b, c")).toBeNull();
    expect(parseStoreLine("Name, XX, BG, https://x, sheet, A")).toBeNull();
    expect(parseStoreLine("Name, DE, DE, https://x, sheet, A")).toBeNull();
    expect(parseStoreLine("Name, DE, BG, https://x, csv, A")).toBeNull();
    expect(parseStoreLine("Name, DE, BG, , sheet, A")).toBeNull();
  });
});

describe("parseStoreText", () => {
  it("skips invalid lines and keeps valid ones", () => {
    const entries = parseStoreText(
      ["# store", "", "A, EN, DE, https://a, sheet, Ann", "broken line", "B, FR, ES, https://b, tsv, Bob"].join("\n"),
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe("A");
    expect(entries[1].author).toBe("Bob");
  });
});

describe("fetchStoreEntries", () => {
  it("fetches fresh from the store file URL with cache busting", async () => {
    const stub = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("A, EN, DE, https://a, sheet, Ann"),
    });
    vi.stubGlobal("fetch", stub);
    const entries = await fetchStoreEntries();
    expect(stub).toHaveBeenCalledTimes(1);
    const [url, init] = stub.mock.calls[0] as [string, RequestInit];
    expect(url.startsWith(STORE_FILE_URL)).toBe(true);
    expect(url).toMatch(/\?t=\d+$/);
    expect(init?.cache).toBe("no-store");
    expect(entries).toHaveLength(1);
    expect(entries[0].linkType).toBe("sheet");
  });

  it("hits the network on every call (no stale cache)", async () => {
    const stub = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("") });
    vi.stubGlobal("fetch", stub);
    await fetchStoreEntries();
    await fetchStoreEntries();
    expect(stub).toHaveBeenCalledTimes(2);
  });

  it("throws on HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchStoreEntries()).rejects.toThrow("404");
  });
});
