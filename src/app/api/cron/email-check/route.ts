import { NextRequest } from "next/server";
import { ok, error } from "@/lib/utils/api-helpers";
import { listUnreadEmails, getEmail, getPdfAttachments, getAttachment, markAsRead, getEmailHeader } from "@/lib/google/gmail";
import { parseInvoiceDocument } from "@/lib/ai/document-parser";
import { categorizeExpense } from "@/lib/ai/categorizer";
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
        console.log("[email-check] Found attachments:", attachments.length, attachments.map(a => a.filename));

        for (const attachment of attachments) {
          try {
            console.log("[email-check] Processing attachment:", attachment.filename);

            // 1. Download PDF
            const pdfBuffer = await getAttachment(msg.id, attachment.attachmentId);
            console.log("[email-check] PDF downloaded, size:", pdfBuffer.length);

            // 2. AI parse invoice
            const parsed = await parseInvoiceDocument(pdfBuffer);
            console.log("[email-check] Parsed:", JSON.stringify(parsed));

            // 3. Upload to Google Drive (best effort)
            let pdfUrl = "";
            try {
              const year = today().slice(0, 4);
              pdfUrl = await uploadDocument(
                pdfBuffer,
                attachment.filename,
                "EMAIL",
                "Purchase_Invoices",
                year
              );
              console.log("[email-check] Uploaded to Drive:", pdfUrl);
            } catch (driveErr) {
              console.warn("[email-check] Drive upload failed, continuing without PDF URL:", driveErr instanceof Error ? driveErr.message : driveErr);
            }

            // 4. Save directly to sheet
            const purchInvId = await nextId(SHEETS.PurchaseInvoices, "PurchInv_ID", ID_PREFIXES.PurchaseInvoice);

            // AI categorize each line item to get the proper GL account
            const lineItems = await Promise.all(
              parsed.lineItems.map(async (li) => {
                const cat = await categorizeExpense(li.description, parsed.vendorName ?? undefined, li.amount);
                console.log(`[email-check] Line "${li.description}" → ${cat.suggestedAccount} (${cat.accountName}) confidence:${cat.confidence}`);
                return {
                  Description: li.description,
                  Account_Code: cat.suggestedAccount,
                  Amount: li.amount,
                  Tax_Amount: 0,
                };
              })
            );

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
            console.log("[email-check] Row saved:", purchInvId);
          } catch (attErr) {
            console.error("[email-check] Attachment error:", attachment.filename, attErr);
          }
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
