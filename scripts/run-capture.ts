// Run the invoice capture by hand against an explicitly named book.
//
// The cron resolves the tenant from the sender via the master Accounts sheet.
// This runs the same ingest with the tenant supplied directly, which is useful
// for backfilling a queue or for operating before that sheet is reachable.
//
// Run: npm run capture -- --limit 5 [--dry-run] [--keep-unread]
import { config } from "dotenv";
config({ path: ".env.local", quiet: true } as never);

import { listUnreadEmails, getEmail, getPdfAttachments, getAttachment, getEmailHeader, markProcessed } from "../src/lib/google/gmail";
import { runWithTenant } from "../src/lib/tenant/context";
import { ingestInvoiceAttachment } from "../src/lib/invoices/ingest";
import { invoiceSearchQuery } from "../src/lib/google/invoice-query";
import { normalizeSpreadsheetId } from "../src/lib/google/spreadsheet-id";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const has = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const limit = Number(arg("limit") ?? 5);
  const dryRun = has("dry-run");
  const keepUnread = has("keep-unread");  // skip labelling, for repeat runs

  const spreadsheetId = normalizeSpreadsheetId(arg("spreadsheet") ?? process.env.GOOGLE_SPREADSHEET_ID!);
  const accountNo = arg("account") ?? "ACC-001";
  const ownerEmail = arg("email") ?? process.env.GMAIL_MONITOR_ADDRESS!;
  const monitor = process.env.GMAIL_MONITOR_ADDRESS ?? "";

  console.log(`\nTarget book : ${spreadsheetId}`);
  console.log(`Account     : ${accountNo} (${ownerEmail})`);
  console.log(`Limit       : ${limit}${dryRun ? "   [DRY RUN — nothing will be written]" : ""}\n`);

  const messages = await listUnreadEmails(
    invoiceSearchQuery()
  );
  console.log(`${messages.length} unread candidate(s); processing up to ${limit}.\n`);

  let filed = 0;
  let notInvoice = 0;
  let failed = 0;

  for (const msg of messages.slice(0, limit)) {
    const messageId = msg.id;
    if (!messageId) continue;

    const email = await getEmail(messageId);
    const from = getEmailHeader(email, "From");
    const subject = getEmailHeader(email, "Subject") || "(no subject)";
    const attachments = getPdfAttachments(email);
    console.log(`- "${subject}" (${attachments.length} attachment(s))`);

    if (dryRun) continue;

    let anyFiled = false;
    await runWithTenant({ accountNo, spreadsheetId, email: ownerEmail }, async () => {
      for (const attachment of attachments) {
        try {
          const buffer = await getAttachment(messageId, attachment.attachmentId);
          const result = await ingestInvoiceAttachment({
            buffer,
            mimeType: attachment.mimeType,
            filename: attachment.filename,
            sourceEmail: from,
          });
          if (result.status === "filed") {
            console.log(`    filed ${result.purchInvId}  <- ${attachment.filename}`);
            filed++;
            anyFiled = true;
          } else {
            console.log(`    skipped ${attachment.filename} — not an invoice`);
            notInvoice++;
          }
        } catch (err) {
          console.log(`    ERROR ${attachment.filename}: ${(err as Error).message}`);
          failed++;
        }
      }
    });

    // Label only when something was filed, so failures stay in the candidate
    // set for a retry.
    if (anyFiled && !keepUnread) await markProcessed(messageId);
  }

  console.log(`\nfiled=${filed}  not-an-invoice=${notInvoice}  errors=${failed}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
