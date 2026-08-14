import { parseTsvText, type SheetRow } from "@/services/importer";

const SHEET_ID_RE = /\/d\/([a-zA-Z0-9_-]+)/;
const GID_RE = /(?:[?&#]gid=)(\d+)/;

/** A parsed public Google Sheets link. */
export interface ParsedSheetLink {
  spreadsheetId: string;
  gid?: string;
  /** Original pasted URL preserved for storage. */
  raw: string;
}

/** The TSV export endpoint for a spreadsheet (works with "Anyone with link"). */
export function buildExportUrl(link: ParsedSheetLink): string {
  const base = `https://docs.google.com/spreadsheets/d/${link.spreadsheetId}/export?format=tsv`;
  return link.gid ? `${base}&gid=${link.gid}` : base;
}

/**
 * Extract the spreadsheet id (and optional gid) from a public Google Sheets
 * link. Returns `null` when the URL isn't a recognizable Sheets link.
 */
export function parseSheetsLink(input: string): ParsedSheetLink | null {
  const raw = input.trim();
  if (!raw) return null;

  // Spreadsheet ids are 25-44 character [A-Za-z0-9_-] tokens; require the
  // /spreadsheets/d/<id> form.
  const idMatch = raw.match(SHEET_ID_RE);
  if (!idMatch) return null;

  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    host = "";
  }
  if (host && !host.includes("google.com") && !host.includes("googleusercontent.com")) {
    return null;
  }

  const gid = raw.match(GID_RE)?.[1];
  return { spreadsheetId: idMatch[1], gid, raw };
}

export type { SheetRow };

/**
 * Fetch a public Google Sheets tab as tab-separated rows. Throws with a
 * human-readable message when the sheet isn't public (the export endpoint
 * returns an HTML login/denied page for private sheets).
 */
export async function fetchSheetRows(link: ParsedSheetLink): Promise<SheetRow[]> {
  const url = buildExportUrl(link);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Could not reach the sheet (HTTP ${res.status}). Make sure it’s set to “Anyone with the link” and shareable.`,
    );
  }
  const text = await res.text();

  // A sign-in or 404 HTML body means the sheet isn't public.
  if (/<(?:!doctype|html)/i.test(text) || text.includes("google.com/sorry")) {
    throw new Error(
      "The sheet doesn’t appear to be public. Share it as “Anyone with the link can view”, then try again.",
    );
  }

  const rows = await parseTsvText(text);
  if (rows.length === 0) {
    throw new Error("The sheet exported no data. Check that the linked tab has rows.");
  }
  return rows;
}

/**
 * Fetch a generic public URL that serves tab-separated text (e.g. a raw
 * file from GitHub, a paste service, or a .tsv export). Same row contract as
 * the Google Sheets path, so the rest of the import flow is identical.
 */
export async function fetchTsvUrl(rawUrl: string): Promise<SheetRow[]> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("That doesn’t look like a valid URL.");
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("Only http(s) links are supported.");
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not reach the link (HTTP ${res.status}). Make sure it’s publicly accessible.`);
  }
  const text = await res.text();

  // A sign-in or error page isn't tab-separated data.
  if (/<(?:!doctype|html)/i.test(text.slice(0, 500))) {
    throw new Error("That page doesn’t look like raw TSV data — it returned HTML. Use a direct file / raw link.");
  }

  const rows = await parseTsvText(text);
  if (rows.length === 0) {
    throw new Error("The link returned no rows. Check that it points to a file with data.");
  }
  return rows;
}