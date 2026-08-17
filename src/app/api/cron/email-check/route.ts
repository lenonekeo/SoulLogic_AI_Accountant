import { NextRequest } from "next/server";
import { ok, error } from "@/lib/utils/api-helpers";
import { listUnreadEmails, getEmail, getPdfAttachments, getAttachment, markAsRead, getEmailHeader } from "@/lib/google/gmail";
import { getAccountByEmail } from "@/lib/google/accounts";
import { runWithTenant } from "@/lib/tenant/context";
import { invoiceSearchQuery } from "@/lib/google/invoice-query";
import { ingestInvoiceAttachment } from "@/lib/invoices/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pull the bare address out of a `Name <addr@host>` From header. */
function parseFromAddress(from: string): string | null {
  const angled = from.match(/<([^>]+)>/);
  const candidate = (angled ? angled[1] : from).trim().toLowerCase();
  return candidate.includes("@") ? candidate : null;
}

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return error("Unauthorized", 401);
  }

  try {
    // Only process emails that have attachments AND match invoice-related keywords
    // OR come from the user themselves (mobile share)
    const monitorAddress = process.env.GMAIL_MONITOR_ADDRESS ?? "";
    const messages = await listUnreadEmails(
      invoiceSearchQuery(monitorAddress)
    );
    const processed: string[] = [];
    const skipped: string[] = [];

    for (const msg of messages.slice(0, 10)) {
      const messageId = msg.id;
      if (!messageId) continue;
      try {
        const email = await getEmail(messageId);
        const attachments = getPdfAttachments(email);
        const from = getEmailHeader(email, "From");

        // The sender decides which customer's book this invoice belongs to.
        // Without a match there is no safe place to file it, so leave the mail
        // unread for a human rather than guessing.
        const senderAddress = parseFromAddress(from);
        const account = senderAddress ? await getAccountByEmail(senderAddress) : null;
        if (!account?.Spreadsheet_ID) {
          console.warn(`[email-check] No account for sender of message ${messageId}; skipping`);
          skipped.push(messageId);
          continue;
        }

        await runWithTenant(
          {
            accountNo: account.Account_No,
            spreadsheetId: account.Spreadsheet_ID,
            email: account.Email,
          },
          async () => {
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
                  console.log(`[email-check] Filed ${result.purchInvId} for ${account.Account_No}`);
                }
              } catch (attErr) {
                console.error("[email-check] Attachment error:", attachment.filename, attErr);
              }
            }
          }
        );

        await markAsRead(messageId);
        processed.push(messageId);
      } catch (msgErr) {
        console.error("Error processing email:", messageId, msgErr);
      }
    }

    return ok({ processed: processed.length, skipped: skipped.length, messageIds: processed });
  } catch (err) {
    console.error("Email check cron error:", err);
    return error("Failed to check emails");
  }
}
