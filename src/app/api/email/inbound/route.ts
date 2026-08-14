import { NextRequest } from "next/server";
import { getEmail, getAttachment, getPdfAttachments, getEmailHeader, markAsRead } from "@/lib/google/gmail";
import { getAccountByEmail } from "@/lib/google/accounts";
import { runWithTenant } from "@/lib/tenant/context";
import { ingestInvoiceAttachment } from "@/lib/invoices/ingest";
import { ok, error } from "@/lib/utils/api-helpers";

export const runtime = "nodejs";

/** Pull the bare address out of a `Name <addr@host>` From header. */
function parseFromAddress(from: string): string | null {
  const angled = from.match(/<([^>]+)>/);
  const candidate = (angled ? angled[1] : from).trim().toLowerCase();
  return candidate.includes("@") ? candidate : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messageId = body.message?.data
      ? Buffer.from(body.message.data, "base64").toString("utf-8")
      : body.messageId;

    if (!messageId) return ok({ received: true });

    const message = await getEmail(messageId);
    const from = getEmailHeader(message, "from");
    const pdfAttachments = getPdfAttachments(message);

    // The sender decides whose book this belongs to; without a match there is
    // no safe place to file it.
    const senderAddress = parseFromAddress(from);
    const account = senderAddress ? await getAccountByEmail(senderAddress) : null;
    if (!account?.Spreadsheet_ID) {
      console.warn(`[email-inbound] No account for sender of message ${messageId}; skipping`);
      return ok({ received: true, processed: 0, skipped: true });
    }

    let processedCount = 0;
    const errors: string[] = [];

    await runWithTenant(
      {
        accountNo: account.Account_No,
        spreadsheetId: account.Spreadsheet_ID,
        email: account.Email,
      },
      async () => {
        for (const attachment of pdfAttachments) {
          try {
            const buffer = await getAttachment(messageId, attachment.attachmentId);
            const result = await ingestInvoiceAttachment({
              buffer,
              mimeType: attachment.mimeType,
              filename: attachment.filename,
              sourceEmail: from,
            });
            if (result.status === "filed") processedCount++;
          } catch (attachErr) {
            errors.push(
              `${attachment.filename}: ${attachErr instanceof Error ? attachErr.message : "Unknown error"}`
            );
          }
        }
      }
    );

    await markAsRead(messageId);

    return ok({ received: true, processed: processedCount, errors });
  } catch (err) {
    console.error("Email inbound error:", err);
    return error("Failed to process inbound email");
  }
}
