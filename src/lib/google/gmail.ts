import { google, gmail_v1 } from "googleapis";
import { getGmailAuth } from "./auth";

function getGmailClient(): gmail_v1.Gmail {
  return google.gmail({ version: "v1", auth: getGmailAuth() });
}

// ── Send an email via Gmail API ──
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>
): Promise<void> {
  const gmail = getGmailClient();

  const boundary = `boundary_${Date.now()}`;
  const fromAddress = process.env.GMAIL_MONITOR_ADDRESS ?? "noreply@soullogic.ai";

  let rawMessage = [
    `From: ${fromAddress}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    "",
    html,
  ].join("\r\n");

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      const mimeType = att.contentType ?? "application/pdf";
      const b64 = att.content.toString("base64");
      rawMessage += [
        "",
        `--${boundary}`,
        `Content-Type: ${mimeType}; name="${att.filename}"`,
        `Content-Disposition: attachment; filename="${att.filename}"`,
        `Content-Transfer-Encoding: base64`,
        "",
        b64,
      ].join("\r\n");
    }
  }

  rawMessage += `\r\n--${boundary}--`;

  const encoded = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });
}

// ── List unread emails from a label/query ──
export async function listUnreadEmails(query: string = "is:unread"): Promise<gmail_v1.Schema$Message[]> {
  const gmail = getGmailClient();
  const response = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 50,
  });
  return response.data.messages ?? [];
}

// ── Get full email by ID ──
export async function getEmail(messageId: string): Promise<gmail_v1.Schema$Message> {
  const gmail = getGmailClient();
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });
  return response.data;
}

// ── Mark email as read ──
export async function markAsRead(messageId: string): Promise<void> {
  const gmail = getGmailClient();
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      removeLabelIds: ["UNREAD"],
    },
  });
}

// ── Extract attachment content from email ──
export async function getAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
  const gmail = getGmailClient();
  const response = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });
  const data = response.data.data ?? "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

// ── Extract email headers ──
export function getEmailHeader(message: gmail_v1.Schema$Message, name: string): string {
  const headers = message.payload?.headers ?? [];
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// ── Extract invoice attachments from email (PDF + images) ──
export function getPdfAttachments(
  message: gmail_v1.Schema$Message
): Array<{ filename: string; attachmentId: string; mimeType: string }> {
  const parts = message.payload?.parts ?? [];
  const results: Array<{ filename: string; attachmentId: string; mimeType: string }> = [];

  const SUPPORTED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];

  function scanParts(parts: gmail_v1.Schema$MessagePart[]): void {
    for (const part of parts) {
      const mime = part.mimeType?.toLowerCase() ?? "";
      const filename = part.filename?.toLowerCase() ?? "";

      const isSupported =
        SUPPORTED_TYPES.includes(mime) ||
        mime === "application/octet-stream" ||
        filename.endsWith(".pdf") ||
        filename.endsWith(".jpg") ||
        filename.endsWith(".jpeg") ||
        filename.endsWith(".png") ||
        filename.endsWith(".webp") ||
        filename.endsWith(".heic") ||
        filename.endsWith(".heif");

      if (isSupported && part.filename && part.body?.attachmentId) {
        results.push({
          filename: part.filename,
          attachmentId: part.body.attachmentId,
          mimeType: part.mimeType ?? "application/octet-stream",
        });
      }
      if (part.parts) scanParts(part.parts);
    }
  }

  scanParts(parts);
  return results;
}

// ── The label this pipeline uses to remember what it has already looked at ──
export const PROCESSED_LABEL = "SoulLogic/Processed";

let _labelId: string | null = null;

/** Resolve the processing label, creating it on first use. */
export async function getProcessedLabelId(): Promise<string> {
  if (_labelId) return _labelId;
  const gmail = getGmailClient();

  const existing = await gmail.users.labels.list({ userId: "me" });
  const found = existing.data.labels?.find((l) => l.name === PROCESSED_LABEL);
  if (found?.id) {
    _labelId = found.id;
    return _labelId;
  }

  const created = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name: PROCESSED_LABEL,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    },
  });
  _labelId = created.data.id!;
  return _labelId;
}

/**
 * Mark a message as handled by this pipeline.
 *
 * A label rather than the read flag: the search has to exclude what it has
 * already examined, and clearing UNREAD on every non-invoice would silently
 * mark unrelated mail as read in someone's inbox.
 */
export async function markProcessed(messageId: string): Promise<void> {
  const gmail = getGmailClient();
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { addLabelIds: [await getProcessedLabelId()] },
  });
}
