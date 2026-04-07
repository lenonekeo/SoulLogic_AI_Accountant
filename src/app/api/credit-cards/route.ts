import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { CreditCard } from "@/types/entities";
import { ID_PREFIXES, RecordStatus } from "@/types/enums";
import { CreditCardSchema } from "@/lib/validation/schemas";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";

export async function GET() {
  try {
    const cards = await readSheetAsObjects<CreditCard>(SHEETS.CreditCards);
    return ok(cards);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch credit cards");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, CreditCardSchema);
    const ccId = await nextId(SHEETS.CreditCards, "CC_ID", ID_PREFIXES.CreditCard);

    const row = [
      ccId, body.Card_Name, body.Card_Number_Last4,
      body.Credit_Limit, 0, body.GL_Account_Code,
      RecordStatus.Active, body.Notes ?? "",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];

    await appendRow(SHEETS.CreditCards, row);
    return ok({ CC_ID: ccId, ...body, Current_Balance: 0, Status: RecordStatus.Active }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create credit card");
  }
}
