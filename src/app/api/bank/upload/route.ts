import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRows } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { BankAccount } from "@/types/entities";
import { ID_PREFIXES, RecordStatus } from "@/types/enums";
import { nextId } from "@/lib/accounting/id-generator";
import { parseBankCsvRow } from "@/lib/accounting/reconciliation";
import { ok, error } from "@/lib/utils/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bankId = formData.get("bank_id") as string | null;

    if (!file) return error("No file uploaded", 400);
    if (!bankId) return error("bank_id is required", 400);

    const banks = await readSheetAsObjects<BankAccount>(SHEETS.BankAccounts);
    const bank = banks.find((b) => b.Bank_ID === bankId);
    if (!bank) return error(`Bank account ${bankId} not found`, 404);

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());

    // Skip header row
    const dataLines = lines.slice(1);
    const rows: (string | number | boolean)[][] = [];
    const errors: string[] = [];
    const transactionIds: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const cols = dataLines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const parsed = parseBankCsvRow(cols);
      if (!parsed) {
        errors.push(`Row ${i + 2}: Invalid format`);
        continue;
      }

      const btId = await nextId(SHEETS.BankTransactions, "BT_ID", ID_PREFIXES.BankTransaction);
      transactionIds.push(btId);

      rows.push([
        btId, bankId, parsed.date, parsed.description,
        parsed.debit, parsed.credit, parsed.balance,
        "", "", "", "FALSE", RecordStatus.Active, "",
        "", "", "", "", "", "", "", "",
      ]);
    }

    if (rows.length > 0) {
      await appendRows(SHEETS.BankTransactions, rows);
    }

    return ok({
      success: true,
      processed: rows.length,
      errors,
      transactionIds,
    });
  } catch (err) {
    console.error(err);
    return error("Failed to upload bank statement");
  }
}
