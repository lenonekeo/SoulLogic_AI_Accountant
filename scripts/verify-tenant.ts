import { config } from "dotenv";
config({ path: ".env.local" });
import { runWithTenant, getTenantSpreadsheetId, getExplicitTenant } from "../src/lib/tenant/context";
import { normalizeSpreadsheetId } from "../src/lib/google/spreadsheet-id";
import { buildPurchaseInvoiceRow } from "../src/lib/invoices/ingest";
import { SHEET_HEADERS, SHEETS } from "../src/types/sheets";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { console.log(`  PASS  ${name}`); pass++; }
  else { console.log(`  FAIL  ${name} ${detail}`); fail++; }
}

async function main() {
  console.log("\n-- normalizeSpreadsheetId --");
  check("bare id passes through", normalizeSpreadsheetId("1d3El4abcXYZ_HWg") === "1d3El4abcXYZ_HWg");
  check(
    "full URL is reduced to the id",
    normalizeSpreadsheetId("https://docs.google.com/spreadsheets/d/1d3El4abcXYZ_HWg/edit?usp=sharing") === "1d3El4abcXYZ_HWg"
  );
  check("whitespace trimmed", normalizeSpreadsheetId("  abc123  ") === "abc123");
  try { normalizeSpreadsheetId(""); check("empty rejected", false); }
  catch { check("empty rejected", true); }
  try { normalizeSpreadsheetId("https://example.com/nope"); check("junk URL rejected", false); }
  catch { check("junk URL rejected", true); }

  console.log("\n-- tenant context --");
  check("no ambient tenant by default", getExplicitTenant() === undefined);

  const got = await runWithTenant(
    { accountNo: "ACC-1", spreadsheetId: "SHEET_ONE" },
    async () => getTenantSpreadsheetId()
  );
  check("runWithTenant supplies its spreadsheet", got === "SHEET_ONE", `(got ${got})`);

  // Two tenants running concurrently must not observe each other's context.
  const [a, b] = await Promise.all([
    runWithTenant({ accountNo: "A", spreadsheetId: "SHEET_A" }, async () => {
      await new Promise((r) => setTimeout(r, 30));
      return getTenantSpreadsheetId();
    }),
    runWithTenant({ accountNo: "B", spreadsheetId: "SHEET_B" }, async () => {
      await new Promise((r) => setTimeout(r, 5));
      return getTenantSpreadsheetId();
    }),
  ]);
  check("concurrent tenants stay isolated", a === "SHEET_A" && b === "SHEET_B", `(got ${a}/${b})`);

  check("context does not leak after the run", getExplicitTenant() === undefined);

  try {
    runWithTenant({ accountNo: "X", spreadsheetId: "" }, async () => "x");
    check("empty spreadsheetId rejected", false);
  } catch { check("empty spreadsheetId rejected", true); }

  console.log("\n-- purchase invoice row matches the sheet schema --");
  const headers = SHEET_HEADERS[SHEETS.PurchaseInvoices];
  const row = buildPurchaseInvoiceRow({
    purchInvId: "PI-0001",
    vendorInvoiceNo: "INV-9",
    invoiceDate: "2026-01-01",
    lineItems: "Widget | Gadget",
    glAccountCode: "6000",
    glAccountName: "Other Expenses",
    subtotal: 100,
    taxAmount: 13,
    tax1: "13.00",
    tax2: "0.00",
    total: 113,
    pdfUrl: "https://drive.google.com/file/d/x/view",
    documentName: "PI-0001_INV-9_Acme.pdf",
    sourceEmail: "vendor@example.com",
    accountNo: "ACC-42",
  });
  check(
    "row width equals header count",
    row.length === headers.length,
    `(row ${row.length} vs headers ${headers.length})`
  );
  const totalIdx = headers.indexOf("Total_Amount");
  check("Total_Amount lands in its column", row[totalIdx] === "113.00", `(got ${row[totalIdx]})`);
  const srcIdx = headers.indexOf("Source_Email");
  check("Source_Email lands in its column", row[srcIdx] === "vendor@example.com", `(got ${row[srcIdx]})`);
  const glIdx = headers.indexOf("GL_Account_Code");
  check("GL_Account_Code lands in its column", row[glIdx] === "6000", `(got ${row[glIdx]})`);
  const acctIdx = headers.indexOf("Account_No");
  check("Account_No stamps the owning tenant", row[acctIdx] === "ACC-42", `(got ${row[acctIdx]})`);

  console.log("\n-- fails closed with no tenant and no session --");
  try {
    const leaked = await getTenantSpreadsheetId();
    check("throws instead of returning a default", false, `(returned "${leaked}")`);
  } catch (err) {
    check("throws instead of returning a default", true, `(${(err as Error).name})`);
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
