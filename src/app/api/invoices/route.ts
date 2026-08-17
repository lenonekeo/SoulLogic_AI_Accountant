import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { SalesInvoice } from "@/types/entities";
import { ID_PREFIXES, InvoiceStatus } from "@/types/enums";
import { SalesInvoiceSchema } from "@/lib/validation/schemas";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";
import { today, addPaymentTermsDays } from "@/lib/utils/date";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("client");

    let invoices = await readSheetAsObjects<SalesInvoice>(SHEETS.SalesInvoices);
    if (status) invoices = invoices.filter((i) => i.Status === status);
    if (clientId) invoices = invoices.filter((i) => i.Client_ID === clientId);
    return ok(invoices);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch invoices");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, SalesInvoiceSchema);
    const invoiceId = await nextId(SHEETS.SalesInvoices, "Invoice_ID", ID_PREFIXES.Invoice);

    const lineItems = body.Line_Items;
    const subtotal = lineItems.reduce((sum, li) => sum + li.Amount, 0);
    const taxAmount = lineItems.reduce((sum, li) => sum + li.Tax_Amount, 0);
    const total = subtotal + taxAmount;

    const row = [
      invoiceId, body.Client_ID,
      body.Invoice_Date, body.Due_Date,
      JSON.stringify(lineItems),
      subtotal.toFixed(2), taxAmount.toFixed(2),
      total.toFixed(2), 0, total.toFixed(2),
      InvoiceStatus.Draft, "FALSE", "", body.Notes ?? "",
      "System", "", "",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];

    await appendRow(SHEETS.SalesInvoices, row);

    return ok({
      Invoice_ID: invoiceId, ...body,
      Subtotal: subtotal, Tax_Amount: taxAmount,
      Total_Amount: total, Amount_Paid: 0, Balance_Due: total,
      Status: InvoiceStatus.Draft, GL_Posted: false,
    }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create invoice");
  }
}
