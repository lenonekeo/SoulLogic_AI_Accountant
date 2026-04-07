import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { BankAccount } from "@/types/entities";
import { ID_PREFIXES, RecordStatus } from "@/types/enums";
import { BankAccountSchema } from "@/lib/validation/schemas";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";

export async function GET() {
  try {
    const banks = await readSheetAsObjects<BankAccount>(SHEETS.BankAccounts);
    return ok(banks);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch bank accounts");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, BankAccountSchema);
    const bankId = await nextId(SHEETS.BankAccounts, "Bank_ID", ID_PREFIXES.BankAccount);

    const row = [
      bankId, body.Bank_Name, body.Account_Name,
      body.Account_Number_Last4, 0, body.GL_Account_Code,
      RecordStatus.Active, body.Notes ?? "",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];

    await appendRow(SHEETS.BankAccounts, row);
    return ok({ Bank_ID: bankId, ...body, Current_Balance: 0, Status: RecordStatus.Active }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create bank account");
  }
}
