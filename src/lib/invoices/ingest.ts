import { parseInvoiceDocument, parseInvoiceImage, isInvoiceDocument } from "@/lib/ai/document-parser";
import { categorizeExpense } from "@/lib/ai/categorizer";
import { appendRow } from "@/lib/google/sheets";
import { getTenant } from "@/lib/tenant/context";
import { storeDocument } from "@/lib/storage/documents";
import { resolveVendor } from "@/lib/accounting/vendors";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { SHEETS } from "@/types/sheets";
import { ID_PREFIXES, PurchaseStatus } from "@/types/enums";
import { today } from "@/lib/utils/date";
import { sniffContentType } from "@/lib/utils/content-type";

export interface IngestInput {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  /** The From header, recorded as the document's source. */
  sourceEmail: string;
}

export type IngestResult =
  | { status: "filed"; purchInvId: string }
  | { status: "skipped"; reason: "not-an-invoice" | "nothing-extracted" };

function imageMimeFor(mime: string): "image/jpeg" | "image/png" | "image/webp" {
  if (mime === "image/png") return "image/png";
  if (mime === "image/webp") return "image/webp";
  return "image/jpeg";
}

/**
 * Turn one email attachment into a Purchase_Invoices row for the tenant in
 * context: verify it is an invoice, parse it, file the PDF to Drive and
 * categorise each line to a GL account.
 *
 * Both the cron sweep and the inbound-email webhook go through here so the
 * row they append cannot drift out of step with the sheet's columns.
 */
export async function ingestInvoiceAttachment(input: IngestInput): Promise<IngestResult> {
  const { buffer, mimeType, filename, sourceEmail } = input;

  if (!(await isInvoiceDocument(buffer, mimeType))) {
    return { status: "skipped", reason: "not-an-invoice" };
  }

  const mime = mimeType.toLowerCase();
  const parsed = mime.startsWith("image/")
    ? await parseInvoiceImage(buffer, imageMimeFor(mime))
    : await parseInvoiceDocument(buffer);

  // The pre-check can say yes to something that yields nothing — a newsletter
  // logo passed it once and became a row with no vendor, no lines and a zero
  // total. A document with none of those three is not a filable invoice, so
  // stop before an ID is burned on it.
  const hasVendor = Boolean(parsed.vendorName?.trim());
  const hasLines = (parsed.lineItems?.length ?? 0) > 0;
  const hasMoney = Number(parsed.totalAmount ?? 0) !== 0 || Number(parsed.subtotal ?? 0) !== 0;
  if (!hasVendor && !hasLines && !hasMoney) {
    return { status: "skipped", reason: "nothing-extracted" };
  }

  // Allocate the ID first: it names the stored file too.
  const purchInvId = await nextId(SHEETS.PurchaseInvoices, "PurchInv_ID", ID_PREFIXES.PurchaseInvoice);

  const vendor = await resolveVendor(parsed.vendorName);

  const invoiceNo = parsed.invoiceNumber ? `_${parsed.invoiceNumber}` : "";
  // Strip only what a filename genuinely cannot carry. The previous
  // [^a-zA-Z0-9...] class replaced every accented character with an
  // underscore, turning "École" into "_cole" on Quebec invoices.
  const { extension } = sniffContentType(buffer);
  const documentName = `${purchInvId}${invoiceNo}_${vendor.vendorName || "Vendor"}.${extension}`
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  const tenant = await getTenant();

  // Archiving the document is best effort — losing the stored copy should not
  // cost us the parsed invoice.
  let pdfUrl = "";
  try {
    const stored = await storeDocument({
      accountNo: tenant.accountNo,
      category: "purchase-invoices",
      year: today().slice(0, 4),
      filename: documentName,
      buffer,
      ownerEmail: tenant.email,
    });
    pdfUrl = stored.url;
  } catch (storeErr) {
    console.warn(
      "[ingest] Document archive failed, continuing without a URL:",
      storeErr instanceof Error ? storeErr.message : storeErr
    );
  }

  const categorizations = await Promise.all(
    parsed.lineItems.map(async (li) => ({
      li,
      cat: await categorizeExpense(li.description, parsed.vendorName ?? undefined, li.amount),
    }))
  );

  const lineItems = categorizations.map(({ li }) => li.description).join(" | ");

  // Primary GL account = first line item's account (most representative)
  const primaryAccount = categorizations[0]?.cat.suggestedAccount ?? "6000";
  const primaryAccountName = categorizations[0]?.cat.accountName ?? "Other Expenses";

  const subtotal = parsed.subtotal ?? parsed.lineItems.reduce((s, li) => s + li.amount, 0);
  const taxAmount = parsed.taxAmount ?? 0;
  const total = parsed.totalAmount ?? subtotal + taxAmount;

  // Individual tax lines, for multi-region invoices (GST/QST and friends).
  const taxLines = parsed.taxes ?? [];
  const tax1 = taxLines[0]?.amount.toFixed(2) ?? "0.00";
  const tax2 = taxLines[1]?.amount.toFixed(2) ?? "0.00";

  const row = buildPurchaseInvoiceRow({
    purchInvId,
    vendorId: vendor.vendorId,
    vendorName: vendor.vendorName,
    vendorInvoiceNo: parsed.invoiceNumber ?? "",
    invoiceDate: parsed.date ?? today(),
    lineItems,
    glAccountCode: primaryAccount,
    glAccountName: primaryAccountName,
    subtotal,
    taxAmount,
    tax1,
    tax2,
    total,
    pdfUrl,
    documentName,
    sourceEmail,
    accountNo: tenant.accountNo,
  });

  await appendRow(SHEETS.PurchaseInvoices, row);
  return { status: "filed", purchInvId };
}

export interface PurchaseInvoiceRowFields {
  purchInvId: string;
  vendorId: string;
  vendorName: string;
  vendorInvoiceNo: string;
  invoiceDate: string;
  lineItems: string;
  glAccountCode: string;
  glAccountName: string;
  subtotal: number;
  taxAmount: number;
  tax1: string;
  tax2: string;
  total: number;
  pdfUrl: string;
  documentName: string;
  sourceEmail: string;
  accountNo: string;
}

/**
 * Positional row for the Purchase_Invoices tab. Kept pure and separate so its
 * width can be asserted against SHEET_HEADERS — a short row silently shifts
 * every later value into the wrong column.
 */
export function buildPurchaseInvoiceRow(f: PurchaseInvoiceRowFields): (string | number | boolean)[] {
  return [
    f.purchInvId,             // PurchInv_ID
    f.vendorId,               // Vendor_ID
    f.vendorName,             // Vendor_Name
    f.vendorInvoiceNo,        // Vendor_Invoice_No
    f.invoiceDate,            // Invoice_Date
    today(),                  // Due_Date — estimated
    f.lineItems,              // Line_Items
    f.glAccountCode,          // GL_Account_Code
    f.glAccountName,          // GL_Account_Name
    f.subtotal.toFixed(2),    // Subtotal
    f.taxAmount.toFixed(2),   // Tax_Amount
    f.tax1,                   // Tax1_Amount
    f.tax2,                   // Tax2_Amount
    f.total.toFixed(2),       // Total_Amount
    0,                        // Amount_Paid
    f.total.toFixed(2),       // Balance_Due
    PurchaseStatus.Pending,   // Status
    "FALSE",                  // GL_Posted
    f.pdfUrl,                 // PDF_URL
    f.documentName,           // Document_Name
    f.sourceEmail,            // Source_Email
    today(),                  // Received_Date
    "",                       // Approved_By
    "",                       // Approved_Date
    "",                       // Notes
    ...dimensionArray({}, f.accountNo),
  ];
}
