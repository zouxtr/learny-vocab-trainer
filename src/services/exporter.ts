import { escapeCsvCell, type SheetRow } from "@/services/importer";
import type { Word } from "@/db/schema";

export interface ExportOptions {
  sourceName: string;
  targetName: string;
  includeGroup?: boolean;
}

/**
 * Build a CSV string from words using the import-compatible column format.
 * Columns: Source, Target, Grammar, Example, Group (optional)
 */
export function buildExportCsv(
  words: Word[],
  options: ExportOptions,
): string {
  const { sourceName, targetName, includeGroup = true } = options;

  const header = includeGroup
    ? [sourceName, targetName, "Grammar", "Example", "Group"]
    : [sourceName, targetName, "Grammar", "Example"];

  const rows: SheetRow[] = words.map((w) => {
    const base = [
      w.source,
      w.target,
      w.rektion ?? "",
      w.example ?? "",
    ];
    return includeGroup ? [...base, w.group ?? ""] : base;
  });

  const lines = [
    header.join(","),
    ...rows.map((r) => r.map(escapeCsvCell).join(",")),
  ];
  return lines.join("\n");
}

/**
 * Trigger a client-side download of the given text as a .csv file.
 */
export function downloadCsv(filename: string, content: string): void {
  // Add BOM for Excel UTF-8 compatibility
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Build and download an XLSX file from words using exceljs.
 * Columns match the import format: Source, Target, Grammar, Example, Group
 */
export async function downloadXlsx(
  words: Word[],
  options: ExportOptions,
  filename: string,
): Promise<void> {
  const { sourceName, targetName, includeGroup = true } = options;

  // Dynamic import to keep bundle small
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Words");

  // Header row
  const header = includeGroup
    ? [sourceName, targetName, "Grammar", "Example", "Group"]
    : [sourceName, targetName, "Grammar", "Example"];

  ws.addRow(header);

  // Style header
  const headerRow = ws.getRow(1);
  if (headerRow) {
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2D2D2D" },
    };
  }

  // Data rows
  for (const w of words) {
    const row = includeGroup
      ? [w.source, w.target, w.rektion ?? "", w.example ?? "", w.group ?? ""]
      : [w.source, w.target, w.rektion ?? "", w.example ?? ""];
    ws.addRow(row);
  }

  // Auto-fit columns
  ws.columns?.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 2, 50);
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate a filename based on dictionary name and format.
 */
export function makeExportFilename(
  dictionaryName: string,
  format: "csv" | "xlsx",
): string {
  const safe = dictionaryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const stem = safe || "dictionary";
  return `${stem}-words.${format}`;
}