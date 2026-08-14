import { config } from "dotenv";
config({ path: ".env.local" });
import { runWithTenant, getTenantSpreadsheetId, getExplicitTenant } from "../src/lib/tenant/context";
import { normalizeSpreadsheetId } from "../src/lib/google/spreadsheet-id";

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
