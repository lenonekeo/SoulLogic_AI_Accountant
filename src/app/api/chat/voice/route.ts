import { NextRequest } from "next/server";
import { transcribeAudio, buildConfirmationMessage, requiresTextConfirmation } from "@/lib/voice/whisper";
import { extractIntent } from "@/lib/ai/intent";
import { routeIntent } from "@/lib/chat/router";
import { ok, error } from "@/lib/utils/api-helpers";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { audio, platform, userId, mimeType } = await req.json();

    if (!audio) return error("audio (base64) is required", 400);

    const audioBuffer = Buffer.from(audio, "base64");

    // 1. Transcribe audio via Whisper
    const transcription = await transcribeAudio(audioBuffer, mimeType ?? "audio/webm");

    // 2. Extract intent from transcription
    const intent = await extractIntent(transcription.text);

    // 3. Determine if text confirmation is required
    const isDestructive = ["Reject", "Cancel", "Void"].includes(intent.intent);
    const needsTextConfirm = requiresTextConfirmation(intent.entities.amount, isDestructive);

    // 4. Build confirmation message (ALWAYS confirm before executing from voice)
    const actionDescription = `${intent.intent}: ${JSON.stringify(intent.entities)}`;
    const confirmMsg = buildConfirmationMessage(
      transcription.text,
      actionDescription,
      needsTextConfirm,
      transcription.language
    );

    return ok({
      transcription: transcription.text,
      language: transcription.language,
      confidence: transcription.confidence,
      intent: intent.intent,
      entities: intent.entities,
      confirmationMessage: confirmMsg,
      requiresTextConfirmation: needsTextConfirm,
    });
  } catch (err) {
    console.error("Voice processing error:", err);
    return error(err instanceof Error ? err.message : "Voice processing failed");
  }
}
