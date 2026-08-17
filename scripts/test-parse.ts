// Re-parse specific email attachments without writing anything, to compare
// extraction quality after a prompt change.
// Run: npm run test:parse -- <gmail-search-query>
import { config } from "dotenv";
config({ path: ".env.local", quiet: true } as never);

import { listUnreadEmails, getEmail, getPdfAttachments, getAttachment, getEmailHeader } from "../src/lib/google/gmail";
import { parseInvoiceImage, parseInvoiceDocument } from "../src/lib/ai/document-parser";

async function main() {
  const query = process.argv.slice(2).join(" ") || "has:attachment subject:(invoice OR facture)";
  const limit = 2;

  const messages = await listUnreadEmails(query);
  console.log(`\nQuery: ${query}\n${messages.length} match(es); parsing up to ${limit}.\n`);

  for (const msg of messages.slice(0, limit)) {
    if (!msg.id) continue;
    const email = await getEmail(msg.id);
    const subject = getEmailHeader(email, "Subject") || "(no subject)";

    for (const att of getPdfAttachments(email)) {
      const buffer = await getAttachment(msg.id, att.attachmentId);
      const mime = att.mimeType.toLowerCase();
      const parsed = mime.startsWith("image/")
        ? await parseInvoiceImage(buffer, mime === "image/png" ? "image/png" : "image/jpeg")
        : await parseInvoiceDocument(buffer);

      const lineSum = parsed.lineItems.reduce((s, li) => s + li.amount, 0);
      const tax = parsed.taxAmount ?? 0;
      const total = parsed.totalAmount ?? 0;
      const gap = Math.round((total - (lineSum + tax)) * 100) / 100;

      console.log(`=== ${att.filename}  (${subject}) ===`);
      console.log(`  vendorName : ${parsed.vendorName ?? "(null)"}`);
      console.log(`  invoiceNo  : ${parsed.invoiceNumber ?? "(null)"}`);
      console.log(`  lineItems  : ${parsed.lineItems.length}`);
      for (const li of parsed.lineItems) {
        console.log(`      ${String(li.amount).padStart(8)}  ${li.description}`);
      }
      console.log(`  line sum   : ${lineSum.toFixed(2)}`);
      console.log(`  tax        : ${tax.toFixed(2)}`);
      console.log(`  total      : ${total.toFixed(2)}`);
      console.log(`  reconciles : ${gap === 0 ? "yes" : `NO — off by ${gap.toFixed(2)}`}\n`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
