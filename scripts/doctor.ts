// Diagnose why an emailed invoice did or did not get filed.
// Run: npm run doctor
import { config } from "dotenv";
config({ path: ".env.local" });

import { listAccounts, getAccountByEmail } from "../src/lib/google/accounts";
import { listUnreadEmails, getEmail, getPdfAttachments, getEmailHeader } from "../src/lib/google/gmail";
import { invoiceSearchQuery } from "../src/lib/google/invoice-query";

function ok(msg: string) { console.log(`  ok    ${msg}`); }
function bad(msg: string) { console.log(`  FAIL  ${msg}`); }

async function main() {
  console.log("\n1. Config");
  for (const key of ["MASTER_SPREADSHEET_ID", "GMAIL_MONITOR_ADDRESS", "GMAIL_REFRESH_TOKEN", "GOOGLE_DRIVE_ROOT_FOLDER_ID"]) {
    const v = process.env[key];
    if (v) ok(`${key} set`); else bad(`${key} missing`);
  }

  console.log("\n2. Master Accounts sheet (service account)");
  let accounts: Awaited<ReturnType<typeof listAccounts>> = [];
  try {
    accounts = await listAccounts(false);
    ok(`read ${accounts.length} account row(s)`);
    for (const a of accounts) {
      console.log(`        ${a.Account_No}  ${a.Email}  status=${a.Status || "(blank)"}`);
    }
  } catch (err) {
    bad(`cannot read Accounts: ${(err as Error).message}`);
  }

  const monitor = process.env.GMAIL_MONITOR_ADDRESS ?? "";
  console.log(`\n3. Is the monitored address provisioned? (${monitor})`);
  try {
    const acct = await getAccountByEmail(monitor);
    if (acct?.Spreadsheet_ID) ok(`resolves to ${acct.Account_No} -> ${acct.Spreadsheet_ID}`);
    else bad(`no Accounts row for ${monitor} — mail from this sender will be SKIPPED`);
  } catch (err) {
    bad(`lookup failed: ${(err as Error).message}`);
  }

  console.log("\n4. Gmail access (OAuth refresh token)");
  const query = invoiceSearchQuery();
  try {
    const msgs = await listUnreadEmails(query);
    ok(`query matched ${msgs.length} unread message(s)`);
    for (const m of msgs.slice(0, 5)) {
      if (!m.id) continue;
      const full = await getEmail(m.id);
      const from = getEmailHeader(full, "From");
      const subject = getEmailHeader(full, "Subject");
      const atts = getPdfAttachments(full);
      console.log(`        "${subject}" from ${from} — ${atts.length} usable attachment(s)`);
      for (const a of atts) console.log(`            ${a.filename} (${a.mimeType})`);
    }
  } catch (err) {
    bad(`Gmail call failed: ${(err as Error).message}`);
    console.log("        If this is invalid_grant, the refresh token expired.");
    console.log("        Re-mint it with: node scripts/get-gmail-token.mjs");
  }

  console.log("");
}

main().catch((e) => { console.error(e); process.exit(1); });
