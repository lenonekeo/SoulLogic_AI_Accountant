import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { SalesReceipt } from "@/types/entities";
import { ID_PREFIXES, ReceiptStatus } from "@/types/enums";
import { SalesReceiptSchema } from "@/lib/validation/schemas";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("client");
    let receipts = await readSheetAsObjects<SalesReceipt>(SHEETS.SalesReceipts);
    if (clientId) receipts = receipts.filter((r) => r.Client_ID === clientId);
    return ok(receipts);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch receipts");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, SalesReceiptSchema);
    const receiptId = await nextId(SHEETS.SalesReceipts, "Receipt_ID", ID_PREFIXES.Receipt);

    const row = [
      receiptId, body.Client_ID, body.Invoice_ID ?? "",
      body.Receipt_Date, body.Amount, body.Payment_Method,
      body.Reference_Number ?? "", body.Bank_ID ?? "",
      ReceiptStatus.Draft, "FALSE", "FALSE", "", body.Notes ?? "",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];

    await appendRow(SHEETS.SalesReceipts, row);
    return ok({ Receipt_ID: receiptId, ...body, Status: ReceiptStatus.Draft, GL_Posted: false, SL_Posted: false }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create receipt");
  }
}
