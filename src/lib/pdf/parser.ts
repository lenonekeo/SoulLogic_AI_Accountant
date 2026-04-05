// Polyfill browser APIs required by pdfjs-dist in Node.js environment
if (typeof globalThis.DOMMatrix === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DOMMatrix } = require("dommatrix") as { DOMMatrix: typeof globalThis.DOMMatrix };
  globalThis.DOMMatrix = DOMMatrix;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

export interface ParsedDocumentData {
  rawText: string;
  date?: string;
  invoiceNumber?: string;
  vendorName?: string;
  clientName?: string;
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
}

// ── Extract text from PDF buffer ──
export async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  const data = await pdfParse(pdfBuffer);
  return data.text;
}

// ── Basic pattern extraction from PDF text ──
export async function parsePdfDocument(pdfBuffer: Buffer): Promise<ParsedDocumentData> {
  const text = await extractPdfText(pdfBuffer);
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Date pattern: YYYY-MM-DD or MM/DD/YYYY or Month DD, YYYY
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{4})|(\w+ \d{1,2},? \d{4})/);

  // Invoice number pattern
  const invoiceMatch = text.match(/(?:invoice|inv|invoice\s*#|inv\s*#)\s*[:\s]*([A-Z0-9-]+)/i);

  // Total amount pattern
  const totalMatch = text.match(/(?:total|amount\s*due|balance\s*due|grand\s*total)[:\s]*\$?([\d,]+\.?\d*)/i);
  const taxMatch = text.match(/(?:tax|gst|hst|qst|vat)[:\s]*\$?([\d,]+\.?\d*)/i);
  const subtotalMatch = text.match(/(?:subtotal|sub\s*total)[:\s]*\$?([\d,]+\.?\d*)/i);

  const totalAmount = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, "")) : undefined;
  const taxAmount = taxMatch ? parseFloat(taxMatch[1].replace(/,/g, "")) : undefined;
  const subtotal = subtotalMatch ? parseFloat(subtotalMatch[1].replace(/,/g, "")) : undefined;

  return {
    rawText: text,
    date: dateMatch?.[0],
    invoiceNumber: invoiceMatch?.[1],
    totalAmount,
    taxAmount,
    subtotal,
  };
}
