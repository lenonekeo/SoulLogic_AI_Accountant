import { NextRequest } from "next/server";
import { ok, error } from "@/lib/utils/api-helpers";
import { listUnreadEmails, getEmail, getPdfAttachments, getAttachment, markAsRead, getEmailHeader } from "@/lib/google/gmail";
import { parseInvoiceDocument } from "@/lib/ai/document-parser";
import { appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { ID_PREFIXES, PurchaseStatus } from "@/types/enums";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { uploadDocument } from "@/lib/google/drive";
import { today } from "@/lib/utils/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return error("Unauthorized", 401);
  }

  try {
    const messages = await listUnreadEmails("is:unread has:attachment filename:pdf subject:(invoice OR bill OR receipt)");
    const processed: string[] = [];

    for (const msg of messages.slice(0, 10)) {
      if (!msg.id) continue;
      try {
        const email = await getEmail(msg.id);
        const attachments = getPdfAttachments(email);
        const from = getEmailHeader(email, "From");

        for (const attachment of attachments) {
          // 1. Download PDF
          const pdfBuffer = await getAttachment(msg.id, attachment.attachmentId);

          // 2. AI parse invoice
          const parsed = await parseInvoiceDocument(pdfBuffer);

          // 3. Upload to Google Drive
          const year = today().slice(0, 4);
          const pdfUrl = await uploadDocument(
            pdfBuffer,
            attachment.filename,
            "EMAIL",
            "Purchase_Invoices",
            year
          );

          // 4. Save directly to sheet
          const purchInvId = await nextId(SHEETS.PurchaseInvoices, "PurchInv_ID", ID_PREFIXES.PurchaseInvoice);

          const lineItems = parsed.lineItems.map((li) => ({
            Description: li.description,
            Account_Code: "5000",
            Amount: li.amount,
            Tax_Amount: 0,
          }));

          const subtotal = parsed.subtotal ?? parsed.lineItems.reduce((s, li) => s + li.amount, 0);
          const taxAmount = parsed.taxAmount ?? 0;
          const total = parsed.totalAmount ?? subtotal + taxAmount;

          const row = [
            purchInvId,
            "",                           // Vendor_ID — to be matched manually
            parsed.invoiceNumber ?? "",
            parsed.date ?? today(),
            today(),                      // Due_Date — estimated
            JSON.stringify(lineItems),
            subtotal.toFixed(2),
            taxAmount.toFixed(2),
            total.toFixed(2),
            0,
            total.toFixed(2),
            PurchaseStatus.Pending,
            "FALSE",
            pdfUrl,
            attachment.filename,
            from,
            today(),
            "", "", "",
            ...dimensionArray({}),
          ];

          await appendRow(SHEETS.PurchaseInvoices, row);
        }

        await markAsRead(msg.id);
        processed.push(msg.id);
      } catch (msgErr) {
        console.error("Error processing email:", msg.id, msgErr);
      }
    }

    return ok({ processed: processed.length, messageIds: processed });
  } catch (err) {
    console.error("Email check cron error:", err);
    return error("Failed to check emails");
  }
}
