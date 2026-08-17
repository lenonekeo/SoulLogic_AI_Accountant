// Remove a purchase invoice row, and optionally its archived Drive file.
//
// Run: npm run delete:invoice -- <PurchInv_ID> [--with-file] [--dry-run]
//
// For rows that should never have been filed. The row is deleted outright
// rather than blanked, so no empty gap is left in the sheet.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true } as never);

import { google } from "googleapis";
import { getGoogleAuth } from "../src/lib/google/auth";
import { fileIdFromUrl } from "../src/lib/google/drive";
import { normalizeSpreadsheetId } from "../src/lib/google/spreadsheet-id";
import { SHEET_HEADERS, SHEETS } from "../src/types/sheets";

async function main() {
  const purchInvId = process.argv[2];
  const withFile = process.argv.includes("--with-file");
  const dryRun = process.argv.includes("--dry-run");
  if (!purchInvId) {
    console.error("Usage: npm run delete:invoice -- <PurchInv_ID> [--with-file] [--dry-run]");
    process.exit(1);
  }

  const tab = SHEETS.PurchaseInvoices;
  const headers = SHEET_HEADERS[tab];
  const spreadsheetId = normalizeSpreadsheetId(process.env.GOOGLE_SPREADSHEET_ID!);
  const sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });
  const sheetId = meta.data.sheets?.find((s) => s.properties?.title === tab)?.properties?.sheetId;
  if (sheetId == null) throw new Error(`Tab "${tab}" not found`);

  const values = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A:ZZ` });
  const rows = values.data.values ?? [];
  const idCol = headers.indexOf("PurchInv_ID");
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[idCol] === purchInvId);
  if (rowIndex === -1) throw new Error(`${purchInvId} not found`);

  const row = rows[rowIndex];
  const summary = ["Vendor_Name", "Total_Amount", "Source_Email", "Document_Name"]
    .map((h) => `${h}=${row[headers.indexOf(h)] || "(empty)"}`)
    .join("  ");
  const pdfUrl = String(row[headers.indexOf("PDF_URL")] ?? "");
  const fileId = pdfUrl ? fileIdFromUrl(pdfUrl) : null;

  console.log(`\nrow ${rowIndex + 1}: ${purchInvId}`);
  console.log(`  ${summary}`);
  console.log(`  Drive file: ${fileId ? (withFile ? `${fileId} — will be trashed` : `${fileId} — kept (pass --with-file to trash)`) : "none"}`);

  if (dryRun) {
    console.log("\n  DRY RUN — nothing deleted.\n");
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 },
          },
        },
      ],
    },
  });
  console.log("\n  row deleted.");

  if (withFile && fileId) {
    // Trash rather than delete outright, so it can still be recovered.
    const { getDriveClientForScripts } = await import("./drive-client");
    await getDriveClientForScripts().files.update({ fileId, requestBody: { trashed: true } });
    console.log("  Drive file moved to trash.");
  }
  console.log("");
}

main().catch((e) => { console.error(e); process.exit(1); });
