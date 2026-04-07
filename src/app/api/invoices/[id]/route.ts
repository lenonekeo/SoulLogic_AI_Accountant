import { NextRequest } from "next/server";
import { readSheetAsObjects, updateById } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { SalesInvoice } from "@/types/entities";
import { SalesInvoiceSchema } from "@/lib/validation/schemas";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const invoices = await readSheetAsObjects<SalesInvoice>(SHEETS.SalesInvoices);
    const invoice = invoices.find((i) => i.Invoice_ID === id);
    if (!invoice) throw new NotFoundError("Invoice", id);
    return ok(invoice);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to fetch invoice");
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await parseBody(req, SalesInvoiceSchema);
    const invoices = await readSheetAsObjects<SalesInvoice>(SHEETS.SalesInvoices);
    const existing = invoices.find((i) => i.Invoice_ID === id);
    if (!existing) throw new NotFoundError("Invoice", id);

    const lineItems = body.Line_Items;
    const subtotal = lineItems.reduce((sum, li) => sum + li.Amount, 0);
    const taxAmount = lineItems.reduce((sum, li) => sum + li.Tax_Amount, 0);
    const total = subtotal + taxAmount;

    const row = [
      id, body.Client_ID,
      body.Invoice_Date, body.Due_Date,
      JSON.stringify(lineItems),
      subtotal.toFixed(2), taxAmount.toFixed(2),
      total.toFixed(2), existing.Amount_Paid,
      (total - Number(existing.Amount_Paid)).toFixed(2),
      existing.Status, existing.GL_Posted ? "TRUE" : "FALSE",
      existing.PDF_URL ?? "", body.Notes ?? "",
      existing.Created_By ?? "", existing.Approved_By ?? "",
      existing.Approved_Date ?? "",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];

    await updateById(SHEETS.SalesInvoices, "Invoice_ID", id, row);
    return ok({ ...existing, ...body, Invoice_ID: id, Subtotal: subtotal, Tax_Amount: taxAmount, Total_Amount: total });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to update invoice");
  }
}
