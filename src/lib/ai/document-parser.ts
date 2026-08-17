import Anthropic from "@anthropic-ai/sdk";
import { getClaudeClient, claudeModel, DEFAULT_MAX_TOKENS, askClaudeJson, responseText } from "./claude";
import { DOCUMENT_PARSER_PROMPT } from "./prompts";

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
  taxes?: Array<{ type: string; rate: number | null; amount: number }>;
  taxAmount: number | null;
  totalAmount: number | null;
  currency: string;
  taxType: string | null;
}

/** PDFs carrying an encryption dictionary cannot be read without the password. */
export function isEncryptedPdf(buffer: Buffer): boolean {
  // Only the trailer region matters; scanning the whole file would false-hit on
  // embedded image data that happens to contain these bytes.
  return buffer.subarray(-2048).includes("/Encrypt");
}

// ── Parse a PDF using AI to extract invoice data ──
export async function parseInvoiceDocument(pdfBuffer: Buffer): Promise<ParsedInvoiceData> {
  if (isEncryptedPdf(pdfBuffer)) {
    throw new Error("PDF is password-protected and cannot be read");
  }

  // Send the PDF itself rather than extracted text. Scanned receipts carry no
  // text layer — extraction returned a single space for these — so a
  // text-based prompt was silently shown an empty document.
  const client = getClaudeClient();
  const response = await client.messages.create({
    model: claudeModel(),
    max_tokens: DEFAULT_MAX_TOKENS,
    system: DOCUMENT_PARSER_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBuffer.toString("base64") },
          },
          { type: "text", text: "Parse this invoice and extract all data." },
        ],
      },
    ],
  });

  const text = responseText(response);
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
  const result = JSON.parse(jsonMatch ? jsonMatch[1].trim() : text.trim()) as ParsedInvoiceData;

  return {
    date: result.date ?? null,
    invoiceNumber: result.invoiceNumber ?? null,
    vendorName: result.vendorName ?? null,
    clientName: result.clientName ?? null,
    lineItems: result.lineItems ?? [],
    subtotal: result.subtotal ?? null,
    taxes: result.taxes ?? [],
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
    if (isEncryptedPdf(buffer)) {
      throw new Error("PDF is password-protected and cannot be read");
    }
    content = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
      },
      { type: "text", text: "Is this an invoice, bill, or receipt? Reply only YES or NO." },
    ];
  }

  // Low effort for a yes/no check, but still enough max_tokens to cover
  // thinking plus the answer — thinking is on by default and shares the budget.
  const response = await client.messages.create({
    model: claudeModel(),
    max_tokens: 2048,
    output_config: { effort: "low" },
    messages: [{ role: "user", content }],
  });

  return /\bYES\b/i.test(responseText(response));
}

// ── Parse an image buffer (JPG/PNG) using Claude Vision ──
export async function parseInvoiceImage(
  imageBuffer: Buffer,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ParsedInvoiceData> {
  const client = getClaudeClient();
  const base64 = imageBuffer.toString("base64");

  const response = await client.messages.create({
    model: claudeModel(),
    max_tokens: DEFAULT_MAX_TOKENS,
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

  const text = responseText(response);
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
  const result = JSON.parse(jsonMatch ? jsonMatch[1].trim() : text.trim()) as ParsedInvoiceData;

  return {
    date: result.date ?? null,
    invoiceNumber: result.invoiceNumber ?? null,
    vendorName: result.vendorName ?? null,
    clientName: result.clientName ?? null,
    lineItems: result.lineItems ?? [],
    subtotal: result.subtotal ?? null,
    taxes: result.taxes ?? [],
    taxAmount: result.taxAmount ?? null,
    totalAmount: result.totalAmount ?? null,
    currency: result.currency ?? "CAD",
    taxType: result.taxType ?? null,
  };
}
