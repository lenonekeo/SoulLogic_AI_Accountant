import { NextRequest } from "next/server";
import { sendEmail } from "@/lib/google/gmail";
import { ok, error } from "@/lib/utils/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, attachments } = await req.json();

    if (!to || !subject || !html) {
      return error("to, subject, and html are required", 400);
    }

    const parsedAttachments = attachments?.map((a: { filename: string; content: string; contentType?: string }) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "base64"),
      contentType: a.contentType,
    }));

    await sendEmail(to, subject, html, parsedAttachments);

    return ok({ success: true, sentTo: to });
  } catch (err) {
    console.error("Email send error:", err);
    return error("Failed to send email");
  }
}
