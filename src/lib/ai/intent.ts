import { askClaudeJson } from "./claude";
import { INTENT_EXTRACTION_PROMPT } from "./prompts";
import { IntentResult } from "@/types/api";
import { ChatIntent } from "@/types/enums";

// ── Extract intent and entities from user text ──
export async function extractIntent(text: string): Promise<IntentResult> {
  try {
    const result = await askClaudeJson<IntentResult>(
      INTENT_EXTRACTION_PROMPT,
      text,
      { maxTokens: 1024 }
    );

    // Validate intent is a known value
    if (!Object.values(ChatIntent).includes(result.intent)) {
      result.intent = ChatIntent.GenericQuery;
    }

    return result;
  } catch (err) {
    console.error("Intent extraction failed:", err);
    return {
      intent: ChatIntent.GenericQuery,
      entities: {},
      language: "en",
      confidence: 0,
    };
  }
}
