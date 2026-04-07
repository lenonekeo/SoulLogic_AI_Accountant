import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { PurchaseInvoice } from "@/types/entities";
import { ID_PREFIXES, PurchaseStatus } from "@/types/enums";
import { PurchaseInvoiceSchema } from "@/lib/validation/schemas";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";
import { today } from "@/lib/utils/date";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const vendorId = searchParams.get("vendor");
    let purchases = await readSheetAsObjects<PurchaseInvoice>(SHEETS.PurchaseInvoices);
    if (status) purchases = purchases.filter((p) => p.Status === status);
    if (vendorId) purchases = purchases.filter((p) => p.Vendor_ID === vendorId);
    return ok(purchases);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch purchase invoices");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, PurchaseInvoiceSchema);
    const purchInvId = await nextId(SHEETS.PurchaseInvoices, "PurchInv_ID", ID_PREFIXES.PurchaseInvoice);

    const lineItems = body.Line_Items;
    const subtotal = lineItems.reduce((sum, li) => sum + li.Amount, 0);
    const taxAmount = lineItems.reduce((sum, li) => sum + li.Tax_Amount, 0);
    const total = subtotal + taxAmount;

    const row = [
      purchInvId, body.Vendor_ID, body.Vendor_Invoice_No ?? "",
      body.Invoice_Date, body.Due_Date,
      JSON.stringify(lineItems),
      subtotal.toFixed(2), taxAmount.toFixed(2), total.toFixed(2),
      0, total.toFixed(2),
      PurchaseStatus.Pending, "FALSE", "", "", "", today(), "", "", body.Notes ?? "",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];

    await appendRow(SHEETS.PurchaseInvoices, row);
    return ok({ PurchInv_ID: purchInvId, ...body, Subtotal: subtotal, Tax_Amount: taxAmount, Total_Amount: total, Amount_Paid: 0, Balance_Due: total, Status: PurchaseStatus.Pending, GL_Posted: false }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create purchase invoice");
  }
}
