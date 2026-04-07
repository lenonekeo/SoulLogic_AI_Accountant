// OpenClaw multi-platform chat SDK wrapper

export interface OpenClawMessage {
  platform: string;
  userId: string;
  text?: string;
  audio?: Buffer;
  mimeType?: string;
  sessionId?: string;
  chatId?: string; // Telegram chat_id for reply routing
}

export interface OpenClawResponse {
  text: string;
  platform: string;
  userId: string;
  chatId?: string;
  attachments?: Array<{ type: string; url: string; name: string }>;
}

// ── Send a reply via OpenClaw /hooks/agent → delivers to Telegram ──
export async function sendReply(response: OpenClawResponse): Promise<void> {
  const apiKey = process.env.OPENCLAW_API_KEY;
  const host = (process.env.OPENCLAW_HOST ?? "").replace(/\/$/, "");

  if (!apiKey || !host) {
    console.warn("OpenClaw credentials not configured — skipping send");
    return;
  }

  const body: Record<string, unknown> = {
    message: response.text,
    deliver: true,
    channel: response.platform ?? "telegram",
  };

  // Use chatId (Telegram chat_id) as the delivery target
  if (response.chatId) {
    body.to = response.chatId;
  } else if (response.userId) {
    body.to = response.userId;
  }

  const res = await fetch(`${host}/hooks/agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`OpenClaw sendReply failed ${res.status}: ${text}`);
  }
}

// ── Verify incoming webhook is from OpenClaw (simple bearer token check) ──
export function verifyWebhookToken(token: string): boolean {
  const expected = process.env.OPENCLAW_API_KEY;
  if (!expected) return false;
  return token === expected;
}

// ── Legacy HMAC verification (kept for compatibility) ──
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const secret = process.env.OPENCLAW_WEBHOOK_SECRET;
  if (!secret) return false;

  // Telegram sends the raw secret as X-Telegram-Bot-Api-Secret-Token
  if (signature === secret) return true;

  // HMAC-SHA256 fallback
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return signature === `sha256=${expected}` || signature === expected;
}
