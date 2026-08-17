import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  _client = new Anthropic({ apiKey });
  return _client;
}

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

// Thinking is on by default on current models, so the response can open with a
// thinking block and max_tokens covers thinking plus the reply. Keep this
// generous or long extractions truncate mid-answer.
export const DEFAULT_MAX_TOKENS = 16000;

/**
 * Pull the reply text out of a response.
 *
 * Never index content[0]: with thinking enabled the first block is a thinking
 * block, not the answer.
 */
export function responseText(response: Anthropic.Message): string {
  if (response.stop_reason === "refusal") {
    throw new Error(
      `Claude declined this request (${response.stop_details?.category ?? "unspecified"})`
    );
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  if (!text) throw new Error("No text content in Claude response");

  if (response.stop_reason === "max_tokens") {
    throw new Error("Claude response hit max_tokens and is incomplete");
  }
  return text;
}

// ── Send a message to Claude and get a text response ──
export async function askClaude(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number }
): Promise<string> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  return responseText(response);
}

// ── Ask Claude and parse JSON response ──
export async function askClaudeJson<T>(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number }
): Promise<T> {
  const text = await askClaude(systemPrompt, userMessage, options);

  // Extract JSON from response (handles markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

  return JSON.parse(jsonStr) as T;
}
