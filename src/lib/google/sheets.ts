import { google, sheets_v4 } from "googleapis";
import { getGoogleAuth } from "./auth";
import { getTenantSpreadsheetId } from "@/lib/tenant/context";
import { SHEET_HEADERS, colLetter } from "@/types/sheets";

function getSheetsClient(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: getGoogleAuth() });
}

/**
 * Every operation below is scoped to the caller's tenant. There is no default
 * spreadsheet: an unresolved tenant throws rather than falling back, so a
 * missing session can never write one customer's books into another's.
 */
async function targetSpreadsheet(override?: string): Promise<string> {
  return override ?? (await getTenantSpreadsheetId());
}

function headersFor(sheetName: string): string[] {
  const headers = SHEET_HEADERS[sheetName];
  if (!headers) throw new Error(`Unknown sheet: ${sheetName}`);
  return headers;
}

// ── Read all rows from a sheet tab ──
export async function readSheet(sheetName: string, spreadsheetId?: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  const headers = headersFor(sheetName);

  const lastCol = colLetter(headers.length - 1);
  const range = `${sheetName}!A2:${lastCol}`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: await targetSpreadsheet(spreadsheetId),
    range,
  });

  return response.data.values ?? [];
}

// ── Read all rows and return as typed objects using header map ──
export async function readSheetAsObjects<T>(sheetName: string, spreadsheetId?: string): Promise<T[]> {
  const headers = headersFor(sheetName);

  const rows = await readSheet(sheetName, spreadsheetId);
  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] ?? "";
      });
      return obj as T;
    });
}

// ── Append a new row to a sheet ──
export async function appendRow(sheetName: string, values: (string | number | boolean)[], spreadsheetId?: string): Promise<void> {
  const sheets = getSheetsClient();
  const headers = headersFor(sheetName);

  const lastCol = colLetter(headers.length - 1);
  const range = `${sheetName}!A:${lastCol}`;

  await sheets.spreadsheets.values.append({
    spreadsheetId: await targetSpreadsheet(spreadsheetId),
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [values.map((v) => (v === undefined || v === null ? "" : String(v)))],
    },
  });
}

// ── Find the row index (1-based, including header) of a record by its ID ──
export async function findRowIndex(
  sheetName: string,
  idColumn: string,
  id: string,
  spreadsheetId?: string
): Promise<number> {
  const sheets = getSheetsClient();
  const headers = headersFor(sheetName);

  const colIndex = headers.indexOf(idColumn);
  if (colIndex === -1) throw new Error(`Column ${idColumn} not found in ${sheetName}`);

  const col = colLetter(colIndex);
  const range = `${sheetName}!${col}:${col}`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: await targetSpreadsheet(spreadsheetId),
    range,
  });

  const cells = response.data.values ?? [];
  for (let i = 1; i < cells.length; i++) {
    // skip header row
    if (cells[i]?.[0] === id) {
      return i + 1; // 1-based row index
    }
  }
  return -1;
}

// ── Update specific cells in a row by row number ──
export async function updateRow(
  sheetName: string,
  rowIndex: number,
  values: (string | number | boolean)[],
  spreadsheetId?: string
): Promise<void> {
  const sheets = getSheetsClient();
  const headers = headersFor(sheetName);

  const lastCol = colLetter(headers.length - 1);
  const range = `${sheetName}!A${rowIndex}:${lastCol}${rowIndex}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: await targetSpreadsheet(spreadsheetId),
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [values.map((v) => (v === undefined || v === null ? "" : String(v)))],
    },
  });
}

// ── Update a single cell in a row ──
export async function updateCell(
  sheetName: string,
  rowIndex: number,
  columnName: string,
  value: string | number | boolean,
  spreadsheetId?: string
): Promise<void> {
  const sheets = getSheetsClient();
  const headers = headersFor(sheetName);

  const colIndex = headers.indexOf(columnName);
  if (colIndex === -1) throw new Error(`Column ${columnName} not found in ${sheetName}`);

  const col = colLetter(colIndex);
  const range = `${sheetName}!${col}${rowIndex}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: await targetSpreadsheet(spreadsheetId),
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[String(value)]],
    },
  });
}

// ── Find record by ID and update it ──
export async function updateById(
  sheetName: string,
  idColumn: string,
  id: string,
  values: (string | number | boolean)[],
  spreadsheetId?: string
): Promise<boolean> {
  // Resolve once so the lookup and the write cannot target different books.
  const target = await targetSpreadsheet(spreadsheetId);
  const rowIndex = await findRowIndex(sheetName, idColumn, id, target);
  if (rowIndex === -1) return false;
  await updateRow(sheetName, rowIndex, values, target);
  return true;
}

// ── Delete a row (clears content, does not shift rows) ──
export async function clearRowById(
  sheetName: string,
  idColumn: string,
  id: string,
  spreadsheetId?: string
): Promise<boolean> {
  const sheets = getSheetsClient();
  const headers = headersFor(sheetName);

  const target = await targetSpreadsheet(spreadsheetId);
  const rowIndex = await findRowIndex(sheetName, idColumn, id, target);
  if (rowIndex === -1) return false;

  const lastCol = colLetter(headers.length - 1);
  const range = `${sheetName}!A${rowIndex}:${lastCol}${rowIndex}`;

  await sheets.spreadsheets.values.clear({
    spreadsheetId: target,
    range,
  });
  return true;
}

// ── Create all sheet tabs with headers (used by seed script) ──
export async function initializeSheet(sheetName: string, spreadsheetId?: string): Promise<void> {
  const sheets = getSheetsClient();
  const headers = headersFor(sheetName);
  const target = await targetSpreadsheet(spreadsheetId);

  // Check if sheet exists, add if not
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: target });
  const existingSheets = spreadsheet.data.sheets?.map((s) => s.properties?.title) ?? [];

  if (!existingSheets.includes(sheetName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: target,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: sheetName },
            },
          },
        ],
      },
    });
  }

  // Write headers to row 1
  const lastCol = colLetter(headers.length - 1);
  await sheets.spreadsheets.values.update({
    spreadsheetId: target,
    range: `${sheetName}!A1:${lastCol}1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headers],
    },
  });
}

// ── Batch append multiple rows ──
export async function appendRows(
  sheetName: string,
  rows: (string | number | boolean)[][],
  spreadsheetId?: string
): Promise<void> {
  const sheets = getSheetsClient();
  const headers = headersFor(sheetName);

  const lastCol = colLetter(headers.length - 1);
  const range = `${sheetName}!A:${lastCol}`;

  await sheets.spreadsheets.values.append({
    spreadsheetId: await targetSpreadsheet(spreadsheetId),
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows.map((row) =>
        row.map((v) => (v === undefined || v === null ? "" : String(v)))
      ),
    },
  });
}
