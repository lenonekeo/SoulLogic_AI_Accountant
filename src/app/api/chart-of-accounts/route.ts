import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { ChartOfAccount } from "@/types/entities";
import { ChartOfAccountSchema } from "@/lib/validation/schemas";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";

export async function GET() {
  try {
    const accounts = await readSheetAsObjects<ChartOfAccount>(SHEETS.ChartOfAccounts);
    return ok(accounts);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch chart of accounts");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, ChartOfAccountSchema);

    const row = [
      body.Account_Code, body.Account_Name, body.Account_Type,
      body.Sub_Category ?? "", "TRUE",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];

    await appendRow(SHEETS.ChartOfAccounts, row);
    return ok({ ...body, Is_Active: true }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create account");
  }
}
