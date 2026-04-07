import { NextRequest } from "next/server";
import { getEmail, getAttachment, getPdfAttachments, getEmailHeader, markAsRead } from "@/lib/google/gmail";
import { parseInvoiceDocument } from "@/lib/ai/document-parser";
import { appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { ID_PREFIXES, PurchaseStatus } from "@/types/enums";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error } from "@/lib/utils/api-helpers";
import { today } from "@/lib/utils/date";
import { uploadDocument } from "@/lib/google/drive";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messageId = body.message?.data
      ? Buffer.from(body.message.data, "base64").toString("utf-8")
      : body.messageId;

    if (!messageId) return ok({ received: true });

    const message = await getEmail(messageId);
    const subject = getEmailHeader(message, "subject");
    const from = getEmailHeader(message, "from");
    const dateHeader = getEmailHeader(message, "date");

    const pdfAttachments = getPdfAttachments(message);

    let processedCount = 0;
    const errors: string[] = [];

    for (const attachment of pdfAttachments) {
      try {
        // 1. Download PDF attachment
        const pdfBuffer = await getAttachment(messageId, attachment.attachmentId);

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

        // 4. Create purchase invoice draft
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
          "", // Vendor_ID — to be matched manually
          parsed.invoiceNumber ?? "",
          parsed.date ?? today(),
          today(), // Due_Date — estimated
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
        processedCount++;
      } catch (attachErr) {
        errors.push(`${attachment.filename}: ${attachErr instanceof Error ? attachErr.message : "Unknown error"}`);
      }
    }

    // Mark email as read
    await markAsRead(messageId);

    return ok({ received: true, processed: processedCount, errors });
  } catch (err) {
    console.error("Email inbound error:", err);
    return error("Failed to process inbound email");
  }
}
