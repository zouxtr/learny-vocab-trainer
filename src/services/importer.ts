/**
 * Spreadsheet import glue for LearnY.
 *
 * CSV is parsed with papaparse and XLSX with exceljs; both libraries are
 * dynamically imported only when a file is actually picked, so the base
 * bundle stays small. What comes out is a normalized list of word rows that
 * `dictionaryRepository.importWords` persists (with duplicate handling).
 */

export type FieldTarget =
  | "source" // word language
  | "target" // translation language
  | "grammar"
  | "example"
  | "group"
  | "skip";

/** One spreadsheet cell row, string-normalized. */
export type SheetRow = string[];

export const FIELD_OPTIONS: { value: FieldTarget; label: string }[] = [
  { value: "skip", label: "Skip column" },
  { value: "source", label: "Word" },
  { value: "target", label: "Translation" },
  { value: "grammar", label: "Grammar" },
  { value: "example", label: "Example" },
  { value: "group", label: "Group" },
];

const HEADER_PATTERNS: { field: FieldTarget; re: RegExp }[] = [
  { field: "source", re: /^(source|word|term|front|wort|l'?expression|意味(i)?|单词|単語)\b/i },
  { field: "target", re: /^(target|translation|translate|translated|back|beispiel|übersetzung|traduc)\b/i },
  { field: "grammar", re: /^(grammar|gram|grammatik|rektion|gender|cas\b|artikel|artigo)\b/i },
  { field: "example", re: /^(example|ex\b|satz|ejemplo|esempio)\b/i },
  { field: "group", re: /^(group|category|categor|tag|kategorie)\b/i },
];

/** Read a file as raw rows of trimmed strings (blank lines dropped). */
export async function parseSheet(file: File): Promise<SheetRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(file);
  if (name.endsWith(".xlsx")) return parseXlsx(file);
  throw new Error("Unsupported file type — use a .csv or .xlsx file.");
}

async function parseCsv(file: File): Promise<SheetRow[]> {
  const Papa = (await import("papaparse")).default;
  const text = await file.text();
  const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  return (result.data as string[][]).map((row) =>
    row.map((cell) => (typeof cell === "string" ? cell.trim() : String(cell).trim())),
  );
}

/** Parse a tab-separated text (used for Google Sheets exports). */
export async function parseTsvText(text: string): Promise<SheetRow[]> {
  const Papa = (await import("papaparse")).default;
  const result = Papa.parse<string[]>(text, {
    delimiter: "\t",
    skipEmptyLines: "greedy",
  });
  return (result.data as string[][]).map((row) =>
    row.map((cell) => (typeof cell === "string" ? cell.trim() : String(cell).trim())),
  );
}

async function parseXlsx(file: File): Promise<SheetRow[]> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("The workbook has no sheets.");

  const rows: SheetRow[] = [];
  ws.eachRow((row, _rowNumber) => {
    const validCells: { col: number; text: string }[] = [];
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const v = cell.value;
      if (v === null || v === undefined) return;
      const text =
        typeof v === "object" && "text" in v && typeof v.text === "string"
          ? v.text
          : String(v);
      validCells.push({ col: colNumber, text: text.trim() });
    });
    if (validCells.length === 0) return;

    const maxCol = Math.max(...validCells.map((c) => c.col));
    const values: string[] = Array(maxCol).fill("");
    for (const c of validCells) values[c.col - 1] = c.text;
    rows.push(values);
  });

  return rows.map((r) => r.map((cell) => cell.trim()));
}

/**
 * Guess which column should feed each word field based on header text.
 * When the headers already identify word + translation, keep them; only fall
 * back to the positional A/B convention when headers are not meaningful.
 * Each required field is mapped at most once; extra matches become "skip".
 */
export function guessColumnMap(headers: string[], _data: SheetRow[]): FieldTarget[] {
  const byHeader = headers.map((h) => matchHeader(h));
  const hasSource = byHeader.includes("source");
  const hasTarget = byHeader.includes("target");
  const useHeaders = hasSource && hasTarget;

  const map: FieldTarget[] = byHeader.map((f, i) => {
    if (f !== "skip") return f;
    if (!useHeaders) {
      if (i === 0) return "source";
      if (i === 1) return "target";
    }
    return "skip";
  });

  // Enforce one column per field: keep the first, drop later duplicates.
  const used = new Set<FieldTarget>();
  return map.map((field) => {
    if (field === "skip") return "skip";
    if (used.has(field)) return "skip";
    used.add(field);
    return field;
  });
}

/** Map a single header cell to a field, or "skip" when it doesn't match. */
function matchHeader(header: string): FieldTarget {
  const text = header.trim().toLowerCase();
  if (!text) return "skip";
  for (const { field, re } of HEADER_PATTERNS) {
    if (re.test(text)) return field;
  }
  return "skip";
}

/** Build normalized word rows from raw cells using the per-column mapping. */
export function normalizeRows(
  rows: SheetRow[],
  map: FieldTarget[],
): { source: string; target: string; grammar?: string; example?: string; group?: string }[] {
  const result: { source: string; target: string; grammar?: string; example?: string; group?: string }[] =
    [];
  for (const row of rows) {
    const acc: { source: string; target: string; grammar: string; example: string; group: string } = {
      source: "",
      target: "",
      grammar: "",
      example: "",
      group: "",
    };
    map.forEach((field, i) => {
      if (field === "skip") return;
      const cell = row[i] ?? "";
      if (field === "source") acc.source = cell;
      else if (field === "target") acc.target = cell;
      else if (field === "grammar") acc.grammar = cell;
      else if (field === "example") acc.example = cell;
      else if (field === "group") acc.group = cell;
    });
    result.push(acc);
  }
  return result;
}

/**
 * Build a ready-to-download CSV template. Column headers use the dictionary's
 * actual language names so the format is self-explanatory.
 */
export function buildTemplateCsv(
  sourceName: string,
  targetName: string,
  rows: string[][] = [["casa", "house"], ["perro", "dog"]],
): string {
  const header = [sourceName, targetName, "Grammar", "Example", "Group"];
  const lines = [header.join(","), ...rows.map((r) => r.map(escapeCsvCell).join(","))];
  return lines.join("\n");
}

/** Escape a cell for CSV output. */
export function escapeCsvCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Trigger a client-side download of the given text as a .csv file. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}