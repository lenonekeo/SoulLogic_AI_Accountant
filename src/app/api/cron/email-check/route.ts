import { NextRequest } from "next/server";
import { ok, error } from "@/lib/utils/api-helpers";
import { listUnreadEmails, getEmail, getPdfAttachments, getAttachment, markAsRead, getEmailHeader } from "@/lib/google/gmail";
import { parseInvoiceDocument, parseInvoiceImage } from "@/lib/ai/document-parser";
import { categorizeExpense } from "@/lib/ai/categorizer";
import { appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { ID_PREFIXES, PurchaseStatus } from "@/types/enums";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
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
    // Broad query: any unread email with a PDF or image attachment
    const messages = await listUnreadEmails("is:unread has:attachment");
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

            // 2. AI parse invoice — PDF or image
            const mime = attachment.mimeType.toLowerCase();
            const isImage = mime.startsWith("image/");
            let parsed;
            if (isImage) {
              const imageMime = (
                mime === "image/png" ? "image/png" :
                mime === "image/webp" ? "image/webp" :
                "image/jpeg"
              ) as "image/jpeg" | "image/png" | "image/webp";
              parsed = await parseInvoiceImage(pdfBuffer, imageMime);
            } else {
              parsed = await parseInvoiceDocument(pdfBuffer);
            }
            console.log("[email-check] Parsed:", JSON.stringify(parsed));

            // 4. Generate purchase invoice ID first (needed for filename)
            const purchInvId = await nextId(SHEETS.PurchaseInvoices, "PurchInv_ID", ID_PREFIXES.PurchaseInvoice);

            // 3. Upload to Google Drive with renamed file (best effort)
            const invoiceNo = parsed.invoiceNumber ? `_${parsed.invoiceNumber}` : "";
            const renamedFile = `${purchInvId}${invoiceNo}_${parsed.vendorName ?? "Vendor"}.pdf`
              .replace(/[^a-zA-Z0-9._\-() ]/g, "_"); // sanitize filename
            let pdfUrl = "";
            try {
              const year = today().slice(0, 4);
              // Upload to SoulLogic_Accounting/Purchase_Invoices/YEAR/
              const { getOrCreateFolder, uploadPdf } = await import("@/lib/google/drive");
              const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
              const purchFolderId = await getOrCreateFolder("Purchase_Invoices", rootFolderId);
              const yearFolderId = await getOrCreateFolder(year, purchFolderId);
              const { url } = await uploadPdf(pdfBuffer, renamedFile, yearFolderId);
              pdfUrl = url;
              console.log("[email-check] Uploaded to Drive:", pdfUrl);
            } catch (driveErr) {
              console.warn("[email-check] Drive upload failed, continuing without PDF URL:", driveErr instanceof Error ? driveErr.message : driveErr);
            }

            // AI categorize each line item to get the proper GL account
            const categorizations = await Promise.all(
              parsed.lineItems.map(async (li) => {
                const cat = await categorizeExpense(li.description, parsed.vendorName ?? undefined, li.amount);
                console.log(`[email-check] Line "${li.description}" → ${cat.suggestedAccount} (${cat.accountName}) confidence:${cat.confidence}`);
                return { li, cat };
              })
            );

            const lineItems = categorizations.map(({ li, cat }) => ({
              Description: li.description,
              Account_Code: cat.suggestedAccount,
              Account_Name: cat.accountName,
              Amount: li.amount,
              Tax_Amount: 0,
            }));

            // Primary GL account = first line item's account (most representative)
            const primaryAccount = categorizations[0]?.cat.suggestedAccount ?? "6000";
            const primaryAccountName = categorizations[0]?.cat.accountName ?? "Other Expenses";

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
              primaryAccount,               // GL_Account_Code
              primaryAccountName,           // GL_Account_Name
              subtotal.toFixed(2),
              taxAmount.toFixed(2),
              total.toFixed(2),
              0,
              total.toFixed(2),
              PurchaseStatus.Pending,
              "FALSE",
              pdfUrl,
              renamedFile,
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
