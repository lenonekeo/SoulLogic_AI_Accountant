import { NextRequest } from "next/server";
import { verifyWebhookToken, verifyWebhookSignature, sendReply } from "@/lib/chat/openclaw";
import { extractIntent } from "@/lib/ai/intent";
import { routeIntent } from "@/lib/chat/router";
import { ok, error } from "@/lib/utils/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // ── Auth: accept operator bearer token OR Telegram webhook secret ──
    const authHeader = req.headers.get("authorization") ?? "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const telegramSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
    const openclawToken = req.headers.get("x-openclaw-token") ?? "";
    const legacySig = req.headers.get("x-openclaw-signature") ?? "";

    const authorized =
      verifyWebhookToken(bearerToken) ||
      verifyWebhookToken(openclawToken) ||
      verifyWebhookSignature(rawBody, telegramSecret) ||
      verifyWebhookSignature(rawBody, legacySig);

    if (!authorized) {
      return error("Unauthorized", 401);
    }

    const payload = JSON.parse(rawBody);

    // Support both OpenClaw format and raw Telegram update format
    let text: string | undefined;
    let userId: string | undefined;
    let chatId: string | undefined;
    let platform: string = "telegram";
    let sessionId: string | undefined;

    if (payload.update_id) {
      // Raw Telegram update forwarded directly
      const msg = payload.message ?? payload.edited_message;
      text = msg?.text;
      userId = String(msg?.from?.id ?? "");
      chatId = String(msg?.chat?.id ?? "");
      platform = "telegram";
    } else {
      // OpenClaw-wrapped format
      text = payload.text ?? payload.message;
      userId = payload.userId ?? payload.user_id;
      chatId = payload.chatId ?? payload.chat_id ?? userId;
      platform = payload.platform ?? "telegram";
      sessionId = payload.sessionId;
    }

    if (!text) return ok({ received: true });

    // Extract intent using Claude AI
    const intent = await extractIntent(text);

    // Route to accounting handler
    const result = await routeIntent(intent, {
      userId: userId ?? "unknown",
      platform,
      sessionId,
      language: intent.language,
    });

    // Send reply via OpenClaw back to Telegram
    await sendReply({
      text: result.message,
      platform,
      userId: userId ?? "",
      chatId,
    });

    return ok({ received: true, intent: intent.intent });
  } catch (err) {
    console.error("Chat webhook error:", err);
    return error("Webhook processing failed");
  }
}
