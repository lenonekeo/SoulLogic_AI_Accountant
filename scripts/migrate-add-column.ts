// Insert a newly-added schema column into a live sheet, shifting existing data
// so stored rows stay aligned with SHEET_HEADERS.
//
// Run: npm run migrate:column -- <SheetTabName> <Column_Name> [--dry-run]
//
// Adding a column to SHEET_HEADERS alone silently re-maps every column after
// it: reads return neighbouring values and writes land one cell over. The
// spreadsheet has to be reshaped to match.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true } as never);

import { google } from "googleapis";
import { getGoogleAuth } from "../src/lib/google/auth";
import { normalizeSpreadsheetId } from "../src/lib/google/spreadsheet-id";
import { SHEET_HEADERS } from "../src/types/sheets";

async function main() {
  const tab = process.argv[2];
  const column = process.argv[3];
  const dryRun = process.argv.includes("--dry-run");
  if (!tab || !column) {
    console.error("Usage: npm run migrate:column -- <SheetTabName> <Column_Name> [--dry-run]");
    process.exit(1);
  }

  const expected = SHEET_HEADERS[tab];
  if (!expected) throw new Error(`No schema for tab "${tab}"`);
  const targetIndex = expected.indexOf(column);
  if (targetIndex === -1) throw new Error(`"${column}" is not in SHEET_HEADERS["${tab}"] — add it there first`);

  const spreadsheetId = normalizeSpreadsheetId(process.env.GOOGLE_SPREADSHEET_ID!);
  const sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,gridProperties/columnCount))",
  });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === tab);
  if (!sheet?.properties) throw new Error(`Tab "${tab}" not found in the spreadsheet`);
  const sheetId = sheet.properties.sheetId!;

  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!1:1`,
  });
  const live = (headerRow.data.values?.[0] ?? []) as string[];

  console.log(`\n${tab}`);
  console.log(`  live header width   : ${live.length}`);
  console.log(`  schema header width : ${expected.length}`);

  if (live[targetIndex] === column) {
    console.log(`\n  "${column}" is already at index ${targetIndex} — nothing to do.\n`);
    return;
  }
  if (live.includes(column)) {
    throw new Error(`"${column}" exists at index ${live.indexOf(column)} but the schema puts it at ${targetIndex} — resolve by hand`);
  }

  // The live header must be a prefix of the schema-minus-the-new-column.
  // Trailing labels are allowed to be missing (a previous column was added to
  // the schema but never written into the sheet), but any disagreement inside
  // the overlap means the sheet is laid out differently than the code believes
  // and shifting it would scramble real data.
  const expectedBefore = expected.filter((_, i) => i !== targetIndex);
  if (live.length > expectedBefore.length) {
    throw new Error(`Live header (${live.length}) is wider than the schema allows (${expectedBefore.length}) — resolve by hand`);
  }
  const disagreement = live.findIndex((h, i) => h !== expectedBefore[i]);
  if (disagreement !== -1) {
    throw new Error(
      `Live header differs from the schema at index ${disagreement}: ` +
        `live="${live[disagreement]}" expected="${expectedBefore[disagreement]}" — resolve by hand`
    );
  }
  if (live.length < expectedBefore.length) {
    console.log(`  note: header is missing trailing label(s): ${expectedBefore.slice(live.length).join(", ")}`);
    console.log(`        these will be written in — data rows already carry the values positionally.`);
  }

  console.log(`\n  will insert "${column}" at index ${targetIndex} (column ${String.fromCharCode(65 + targetIndex)})`);
  console.log(`  shifting ${live.length - targetIndex} column(s) right: ${live.slice(targetIndex).join(", ")}`);

  if (dryRun) {
    console.log("\n  DRY RUN — nothing written.\n");
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: { sheetId, dimension: "COLUMNS", startIndex: targetIndex, endIndex: targetIndex + 1 },
            inheritFromBefore: false,
          },
        },
      ],
    },
  });

  // Rewrite the whole header row: the insert has shifted the data into schema
  // positions, and the live labels were verified above to agree with the schema
  // everywhere they existed.
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!1:1`,
    valueInputOption: "RAW",
    requestBody: { values: [expected] },
  });

  const after = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!1:1` });
  const now = (after.data.values?.[0] ?? []) as string[];
  const aligned = expected.every((h, i) => now[i] === h) && now.length === expected.length;
  console.log(`\n  header row now: ${aligned ? "matches SHEET_HEADERS exactly" : "DOES NOT MATCH — inspect the sheet"}`);
  if (!aligned) {
    for (let i = 0; i < Math.max(now.length, expected.length); i++) {
      if (now[i] !== expected[i]) console.log(`    [${i}] live="${now[i] ?? ""}" schema="${expected[i] ?? ""}"`);
    }
    process.exit(1);
  }
  console.log("");
}

main().catch((e) => { console.error(e); process.exit(1); });
