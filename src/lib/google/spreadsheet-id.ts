/**
 * Accept either a bare spreadsheet ID or a full Google Sheets URL.
 *
 * Config and the Accounts sheet are filled in by hand, and pasting the browser
 * URL instead of the ID is the obvious mistake — one that otherwise surfaces as
 * an opaque 404 from the Sheets API.
 */
export function normalizeSpreadsheetId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Empty spreadsheet ID");

  const fromUrl = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (fromUrl) return fromUrl[1];

  if (trimmed.includes("/") || trimmed.includes(" ")) {
    throw new Error(`Not a valid spreadsheet ID or Sheets URL: ${trimmed.slice(0, 40)}…`);
  }
  return trimmed;
}
