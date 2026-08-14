import { describe, it, expect } from "vitest";
import { buildExportCsv, makeExportFilename } from "../src/services/exporter";
import type { Word } from "../src/db/schema";

function makeWord(partial: Partial<Word> = {}): Word {
  return {
    id: "w1",
    dictionaryId: "d1",
    source: "casa",
    target: "house",
    rektion: null,
    example: null,
    group: null,
    notes: null,
    position: 0,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...partial,
  };
}

describe("buildExportCsv", () => {
  it("writes the import-compatible header with language names", () => {
    const csv = buildExportCsv([makeWord()], { sourceName: "English", targetName: "Spanish" });
    const [header] = csv.split("\n");
    expect(header).toBe("English,Spanish,Grammar,Example,Group");
  });

  it("round-trips a word with optional fields", () => {
    const word = makeWord({
      source: "casa",
      target: "house",
      rektion: "la casa",
      example: "La casa es grande, pero pequeña.",
      group: "Home",
    });
    const csv = buildExportCsv([word], { sourceName: "English", targetName: "Spanish" });
    const [, row] = csv.split("\n");
    expect(row).toBe('casa,house,la casa,"La casa es grande, pero pequeña.",Home');
  });

  it("escapes commas and quotes inside cells", () => {
    const word = makeWord({ source: 'hello, world', target: 'he said "hi"' });
    const csv = buildExportCsv([word], { sourceName: "English", targetName: "Spanish" });
    expect(csv).toContain('"hello, world"');
    expect(csv).toContain('"he said ""hi"""');
  });

  it("omits the Group column when includeGroup is false", () => {
    const csv = buildExportCsv([makeWord()], { sourceName: "English", targetName: "Spanish", includeGroup: false });
    const [header] = csv.split("\n");
    expect(header).toBe("English,Spanish,Grammar,Example");
  });
});

describe("makeExportFilename", () => {
  it("slugifies the dictionary name and appends the format", () => {
    expect(makeExportFilename("Spanish for travel", "csv")).toBe("spanish-for-travel-words.csv");
    expect(makeExportFilename("Spanish for travel", "xlsx")).toBe("spanish-for-travel-words.xlsx");
  });

  it("handles punctuation-only names without trailing dashes", () => {
    expect(makeExportFilename("!!!", "csv")).toBe("dictionary-words.csv");
  });
});