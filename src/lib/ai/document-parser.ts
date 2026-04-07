import Anthropic from "@anthropic-ai/sdk";
import { getClaudeClient, CLAUDE_MODEL, askClaudeJson } from "./claude";
import { DOCUMENT_PARSER_PROMPT } from "./prompts";
import { extractPdfText } from "@/lib/pdf/parser";

export interface ParsedInvoiceData {
  date: string | null;
  invoiceNumber: string | null;
  vendorName: string | null;
  clientName: string | null;
  lineItems: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  subtotal: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  currency: string;
  taxType: string | null;
}

// ── Parse PDF buffer using AI to extract invoice data ──
export async function parseInvoiceDocument(pdfBuffer: Buffer): Promise<ParsedInvoiceData> {
  const rawText = await extractPdfText(pdfBuffer);
  const truncated = rawText.slice(0, 4000);

  const result = await askClaudeJson<ParsedInvoiceData>(
    DOCUMENT_PARSER_PROMPT,
    `Parse this invoice document:\n\n${truncated}`
  );

  return {
    date: result.date ?? null,
    invoiceNumber: result.invoiceNumber ?? null,
    vendorName: result.vendorName ?? null,
    clientName: result.clientName ?? null,
    lineItems: result.lineItems ?? [],
    subtotal: result.subtotal ?? null,
    taxAmount: result.taxAmount ?? null,
    totalAmount: result.totalAmount ?? null,
    currency: result.currency ?? "CAD",
    taxType: result.taxType ?? null,
  };
}

// ── Quickly check if a document/image looks like an invoice ──
export async function isInvoiceDocument(
  buffer: Buffer,
  mimeType: string
): Promise<boolean> {
  const client = getClaudeClient();
  const isImage = mimeType.startsWith("image/");

  let content: Anthropic.MessageParam["content"];

  if (isImage) {
    const base64 = buffer.toString("base64");
    const imgMime = (
      mimeType === "image/png" ? "image/png" :
      mimeType === "image/webp" ? "image/webp" :
      "image/jpeg"
    ) as "image/jpeg" | "image/png" | "image/webp";
    content = [
      { type: "image", source: { type: "base64", media_type: imgMime, data: base64 } },
      { type: "text", text: "Is this an invoice, bill, or receipt? Reply only YES or NO." },
    ];
  } else {
    const text = (await import("@/lib/pdf/parser").then(m => m.extractPdfText(buffer))).slice(0, 1000);
    content = `Is this text from an invoice, bill, or receipt? Reply only YES or NO.\n\n${text}`;
  }

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 10,
    messages: [{ role: "user", content }],
  });

  const answer = response.content[0].type === "text" ? response.content[0].text.trim().toUpperCase() : "";
  return answer.startsWith("YES");
}

// ── Parse an image buffer (JPG/PNG) using Claude Vision ──
export async function parseInvoiceImage(
  imageBuffer: Buffer,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ParsedInvoiceData> {
  const client = getClaudeClient();
  const base64 = imageBuffer.toString("base64");

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: DOCUMENT_PARSER_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType, data: base64 },
          },
          { type: "text", text: "Parse this invoice image and extract all data." },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
  const result = JSON.parse(jsonMatch ? jsonMatch[1].trim() : text.trim()) as ParsedInvoiceData;

  return {
    date: result.date ?? null,
    invoiceNumber: result.invoiceNumber ?? null,
    vendorName: result.vendorName ?? null,
    clientName: result.clientName ?? null,
    lineItems: result.lineItems ?? [],
    subtotal: result.subtotal ?? null,
    taxAmount: result.taxAmount ?? null,
    totalAmount: result.totalAmount ?? null,
    currency: result.currency ?? "CAD",
    taxType: result.taxType ?? null,
  };
}
