import { NextRequest } from "next/server";
import { ok, error } from "@/lib/utils/api-helpers";
import { listUnreadEmails, getEmail, getPdfAttachments, getAttachment, markProcessed, getEmailHeader } from "@/lib/google/gmail";
import { resolveTenantAccount } from "@/lib/google/resolve-tenant-email";
import { runWithTenant } from "@/lib/tenant/context";
import { invoiceSearchQuery } from "@/lib/google/invoice-query";
import { ingestInvoiceAttachment } from "@/lib/invoices/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How many messages one sweep examines. */
const BATCH_SIZE = Number(process.env.EMAIL_CHECK_BATCH_SIZE ?? 25);

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return error("Unauthorized", 401);
  }

  try {
    const messages = await listUnreadEmails(invoiceSearchQuery());
    const filed: string[] = [];
    const examined: string[] = [];
    const unclaimed: string[] = [];
    const failed: string[] = [];

    for (const msg of messages.slice(0, BATCH_SIZE)) {
      const messageId = msg.id;
      if (!messageId) continue;
      try {
        const email = await getEmail(messageId);
        const attachments = getPdfAttachments(email);
        const from = getEmailHeader(email, "From");

        // Which customer's book this belongs to — by recipient, since the
        // vendor is the sender.
        const resolved = await resolveTenantAccount(email);
        if (!resolved.account) {
          // Leave it untouched. Unclaimed mail may belong to an account that
          // does not exist yet, and ambiguous mail must not be guessed at —
          // filing one customer's invoice into another's books is worse than
          // leaving it for a human.
          console.warn(`[email-check] ${resolved.reason} for message ${messageId}`);
          unclaimed.push(messageId);
          continue;
        }
        const { account } = resolved;

        let anyFailed = false;
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
                  filed.push(result.purchInvId);
                }
              } catch (attErr) {
                anyFailed = true;
                console.error("[email-check] Attachment error:", attachment.filename, attErr);
              }
            }
          }
        );

        // Label only once every attachment resolved one way or the other, so a
        // transient failure is retried on the next sweep instead of being
        // quietly dropped.
        if (anyFailed) {
          failed.push(messageId);
        } else {
          await markProcessed(messageId);
          examined.push(messageId);
        }
      } catch (msgErr) {
        failed.push(messageId);
        console.error("Error processing email:", messageId, msgErr);
      }
    }

    return ok({
      candidates: messages.length,
      examined: examined.length,
      filed: filed.length,
      unclaimed: unclaimed.length,
      failed: failed.length,
      purchInvIds: filed,
    });
  } catch (err) {
    console.error("Email check cron error:", err);
    return error("Failed to check emails");
  }
}
