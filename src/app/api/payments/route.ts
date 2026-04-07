import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Payment } from "@/types/entities";
import { ID_PREFIXES, PaymentStatus } from "@/types/enums";
import { PaymentSchema } from "@/lib/validation/schemas";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendor");
    let payments = await readSheetAsObjects<Payment>(SHEETS.Payments);
    if (vendorId) payments = payments.filter((p) => p.Vendor_ID === vendorId);
    return ok(payments);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch payments");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, PaymentSchema);
    const paymentId = await nextId(SHEETS.Payments, "Payment_ID", ID_PREFIXES.Payment);

    const row = [
      paymentId, body.PurchInv_ID, body.Vendor_ID,
      body.Payment_Date, body.Amount, body.Payment_Method,
      body.Reference_Number ?? "",
      PaymentStatus.Draft, "FALSE", "FALSE", "", body.Notes ?? "",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];

    await appendRow(SHEETS.Payments, row);
    return ok({ Payment_ID: paymentId, ...body, Status: PaymentStatus.Draft, GL_Posted: false, SL_Posted: false }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create payment");
  }
}
