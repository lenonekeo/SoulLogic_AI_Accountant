import { normalizeSpreadsheetId } from "../src/lib/google/spreadsheet-id";
import { runWithTenant } from "../src/lib/tenant/context";

/**
 * Seed scripts run outside any request, so they must name the book they are
 * about to write to. Pass it as the first argument, or fall back to
 * GOOGLE_SPREADSHEET_ID — an operator running this by hand is an explicit
 * choice, unlike a web request silently defaulting.
 */
export function scriptSpreadsheetId(): string {
  const raw = process.argv[2] ?? process.env.GOOGLE_SPREADSHEET_ID;
  if (!raw) {
    console.error(
      "No target spreadsheet. Pass one as an argument or set GOOGLE_SPREADSHEET_ID."
    );
    process.exit(1);
  }
  return normalizeSpreadsheetId(raw);
}

/** Run a seed routine against the chosen spreadsheet. */
export function runSeed(fn: () => Promise<void>): Promise<void> {
  const spreadsheetId = scriptSpreadsheetId();
  console.log(`Target spreadsheet: ${spreadsheetId}`);
  return runWithTenant({ accountNo: "seed-script", spreadsheetId }, fn);
}
