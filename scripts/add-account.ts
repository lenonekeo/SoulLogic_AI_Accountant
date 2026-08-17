// Register a tenant in the master Accounts registry.
//
// Run: npm run add:account -- <email> <their-spreadsheet-id-or-url> [account-no] [plan]
//
// Sign-in fails closed for anyone without a row here, so this is the step that
// grants access.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true } as never);

import { getAccountByEmail, createAccount, listAccounts } from "../src/lib/google/accounts";
import { normalizeSpreadsheetId } from "../src/lib/google/spreadsheet-id";

async function main() {
  const [email, rawSpreadsheet, accountNoArg, plan] = process.argv.slice(2);
  if (!email || !rawSpreadsheet) {
    console.error("Usage: npm run add:account -- <email> <spreadsheet-id-or-url> [account-no] [plan]");
    process.exit(1);
  }

  const spreadsheetId = normalizeSpreadsheetId(rawSpreadsheet);

  const existing = await getAccountByEmail(email);
  if (existing) {
    console.error(
      `\n${email} is already registered as ${existing.Account_No} -> ${existing.Spreadsheet_ID}.` +
        `\nEdit the row in the registry rather than adding a second one.\n`
    );
    process.exit(1);
  }

  // Continue the ACC-NNN sequence rather than assuming this is the first tenant.
  let accountNo = accountNoArg;
  if (!accountNo) {
    const all = await listAccounts(false);
    const highest = all
      .map((a) => Number(/^ACC-(\d+)$/.exec(a.Account_No)?.[1] ?? 0))
      .reduce((max, n) => Math.max(max, n), 0);
    accountNo = `ACC-${String(highest + 1).padStart(3, "0")}`;
  }

  await createAccount(accountNo, email, spreadsheetId, "", "", plan ?? "starter");
  console.log(`\nRegistered ${accountNo}  ${email}  ->  ${spreadsheetId}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
