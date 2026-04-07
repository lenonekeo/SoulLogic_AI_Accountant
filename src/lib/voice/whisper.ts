import OpenAI from "openai";
import { TranscriptionResult } from "@/types/api";

let _client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  _client = new OpenAI({ apiKey });
  return _client;
}

const MAX_DURATION_SECONDS = 120; // 2 minutes max
const SUPPORTED_FORMATS = ["audio/ogg", "audio/mp3", "audio/m4a", "audio/wav", "audio/webm"];

// ── Transcribe audio buffer using OpenAI Whisper ──
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = "audio/webm"
): Promise<TranscriptionResult> {
  if (!SUPPORTED_FORMATS.includes(mimeType)) {
    throw new Error(`Unsupported audio format: ${mimeType}. Supported: ${SUPPORTED_FORMATS.join(", ")}`);
  }

  const client = getOpenAIClient();

  const extension = mimeType.split("/")[1] ?? "webm";
  const file = new File([audioBuffer as unknown as ArrayBuffer], `audio.${extension}`, { type: mimeType });

  const transcription = await client.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "verbose_json",
    language: undefined, // auto-detect
  });

  const text = typeof transcription === "string" ? transcription : (transcription as { text: string }).text ?? "";
  const language = (transcription as { language?: string }).language ?? "en";
  const duration = (transcription as { duration?: number }).duration ?? 0;

  // Validate duration
  if (duration > MAX_DURATION_SECONDS) {
    throw new Error(`Audio too long: ${Math.round(duration)}s (max ${MAX_DURATION_SECONDS}s)`);
  }

  if (duration < 1) {
    throw new Error("Audio too short (minimum 1 second)");
  }

  const detectedLang = language.startsWith("fr") ? "fr" : "en";

  return {
    text: text.trim(),
    language: detectedLang,
    confidence: 0.9, // Whisper doesn't provide per-result confidence
    duration,
  };
}

// ── Build voice confirmation message ──
export function buildConfirmationMessage(
  transcription: string,
  interpretedAction: string,
  requiresTextConfirmation: boolean,
  language: "en" | "fr" = "en"
): string {
  if (language === "fr") {
    const warning = requiresTextConfirmation
      ? "\n⚠️ En raison du montant élevé, veuillez confirmer par texte."
      : "";
    return `🎤 J'ai entendu: "${transcription}"\n\n📋 Action: ${interpretedAction}\n\nRépondez "oui" pour confirmer ou "annuler" pour abandonner.${warning}`;
  }

  const warning = requiresTextConfirmation
    ? "\n⚠️ Due to the high amount, please confirm via text."
    : "";
  return `🎤 I heard: "${transcription}"\n\n📋 Action: ${interpretedAction}\n\nReply "yes" to confirm or "cancel" to abort.${warning}`;
}

// ── Check if voice action requires text confirmation ──
export function requiresTextConfirmation(
  amount: number | null | undefined,
  isDestructive: boolean
): boolean {
  if (isDestructive) return true;
  if (amount && amount > 10000) return true;
  return false;
}
