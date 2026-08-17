// Re-parse a filed purchase invoice from its source email attachment and
// update the row in place. Use after an extraction improvement, or when a row
// looks wrong.
//
// Run: npm run reextract -- <PurchInv_ID> "<gmail query>" [--dry-run]
//
// Only the extracted fields are rewritten. Anything decided after filing —
// payment, approval, GL posting, the stored PDF — is preserved.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true } as never);

import { listUnreadEmails, getEmail, getPdfAttachments, getAttachment } from "../src/lib/google/gmail";
import { parseInvoiceImage, parseInvoiceDocument } from "../src/lib/ai/document-parser";
import { categorizeExpense } from "../src/lib/ai/categorizer";
import { readSheet, updateById } from "../src/lib/google/sheets";
import { runWithTenant } from "../src/lib/tenant/context";
import { normalizeSpreadsheetId } from "../src/lib/google/spreadsheet-id";
import { SHEET_HEADERS, SHEETS } from "../src/types/sheets";

// Fields that describe what was extracted from the document.
const REWRITTEN = [
  "Vendor_Invoice_No", "Invoice_Date", "Line_Items", "GL_Account_Code",
  "GL_Account_Name", "Subtotal", "Tax_Amount", "Tax1_Amount", "Tax2_Amount",
  "Total_Amount", "Balance_Due",
] as const;

async function main() {
  const purchInvId = process.argv[2];
  const query = process.argv[3];
  const dryRun = process.argv.includes("--dry-run");
  if (!purchInvId || !query) {
    console.error('Usage: npm run reextract -- <PurchInv_ID> "<gmail query>" [--dry-run]');
    process.exit(1);
  }

  const spreadsheetId = normalizeSpreadsheetId(process.env.GOOGLE_SPREADSHEET_ID!);
  const headers = SHEET_HEADERS[SHEETS.PurchaseInvoices];
  const col = (name: string) => {
    const i = headers.indexOf(name);
    if (i === -1) throw new Error(`No such column: ${name}`);
    return i;
  };

  await runWithTenant({ accountNo: "ACC-001", spreadsheetId }, async () => {
    const rows = await readSheet(SHEETS.PurchaseInvoices);
    const existing = rows.find((r) => r[col("PurchInv_ID")] === purchInvId);
    if (!existing) throw new Error(`${purchInvId} not found`);

    // Start from the stored row so every unlisted field carries over verbatim.
    const row: (string | number | boolean)[] = headers.map((_, i) => existing[i] ?? "");

    const messages = await listUnreadEmails(query);
    if (messages.length === 0) throw new Error(`No message matched: ${query}`);
    const email = await getEmail(messages[0].id!);
    const attachments = getPdfAttachments(email);
    if (attachments.length !== 1) {
      throw new Error(`Expected exactly 1 attachment, found ${attachments.length}`);
    }
    const attachment = attachments[0];
    const buffer = await getAttachment(messages[0].id!, attachment.attachmentId);

    const mime = attachment.mimeType.toLowerCase();
    const parsed = mime.startsWith("image/")
      ? await parseInvoiceImage(buffer, mime === "image/png" ? "image/png" : "image/jpeg")
      : await parseInvoiceDocument(buffer);

    const categorizations = await Promise.all(
      parsed.lineItems.map(async (li) => ({
        li,
        cat: await categorizeExpense(li.description, parsed.vendorName ?? undefined, li.amount),
      }))
    );

    const subtotal = parsed.subtotal ?? parsed.lineItems.reduce((s, li) => s + li.amount, 0);
    const taxAmount = parsed.taxAmount ?? 0;
    const total = parsed.totalAmount ?? subtotal + taxAmount;
    const taxLines = parsed.taxes ?? [];
    const amountPaid = Number(existing[col("Amount_Paid")] ?? 0) || 0;

    const updates: Record<string, string> = {
      Vendor_Invoice_No: parsed.invoiceNumber ?? "",
      Invoice_Date: parsed.date ?? String(existing[col("Invoice_Date")] ?? ""),
      Line_Items: categorizations.map(({ li }) => li.description).join(" | "),
      GL_Account_Code: categorizations[0]?.cat.suggestedAccount ?? "6000",
      GL_Account_Name: categorizations[0]?.cat.accountName ?? "Other Expenses",
      Subtotal: subtotal.toFixed(2),
      Tax_Amount: taxAmount.toFixed(2),
      Tax1_Amount: taxLines[0]?.amount.toFixed(2) ?? "0.00",
      Tax2_Amount: taxLines[1]?.amount.toFixed(2) ?? "0.00",
      Total_Amount: total.toFixed(2),
      Balance_Due: (total - amountPaid).toFixed(2),
    };

    console.log(`\n${purchInvId} — ${attachment.filename}\n`);
    for (const field of REWRITTEN) {
      const before = String(existing[col(field)] ?? "");
      const after = updates[field];
      const changed = before !== after;
      console.log(`  ${changed ? "~" : " "} ${field.padEnd(18)} ${changed ? `${before || "(empty)"}  ->  ${after}` : before}`);
      row[col(field)] = after;
    }

    const preserved = headers.filter((h) => !(REWRITTEN as readonly string[]).includes(h));
    console.log(`\n  preserved: ${preserved.join(", ")}\n`);

    if (dryRun) {
      console.log("  DRY RUN — nothing written.\n");
      return;
    }
    const ok = await updateById(SHEETS.PurchaseInvoices, "PurchInv_ID", purchInvId, row);
    console.log(ok ? "  row updated.\n" : "  update failed — row not found.\n");
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
