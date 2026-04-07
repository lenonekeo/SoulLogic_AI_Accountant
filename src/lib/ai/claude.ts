import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  _client = new Anthropic({ apiKey });
  return _client;
}

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

// ── Send a message to Claude and get a text response ──
export async function askClaude(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: options?.maxTokens ?? 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");
  return content.text;
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
