import { NextRequest } from "next/server";
import { extractIntent } from "@/lib/ai/intent";
import { routeIntent } from "@/lib/chat/router";
import { ok, error } from "@/lib/utils/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const { text, userId, platform, sessionId } = await req.json();

    if (!text) return error("text is required", 400);

    const intent = await extractIntent(text);
    const result = await routeIntent(intent, {
      userId: userId ?? "web",
      platform: platform ?? "web",
      sessionId,
      language: intent.language,
    });

    return ok({
      message: result.message,
      intent: intent.intent,
      confidence: intent.confidence,
      requiresConfirmation: result.requiresConfirmation,
      data: result.data,
    });
  } catch (err) {
    console.error("Chat command error:", err);
    return error("Command processing failed");
  }
}
