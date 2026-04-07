import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRows } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { CreditCard } from "@/types/entities";
import { ID_PREFIXES, RecordStatus } from "@/types/enums";
import { nextId } from "@/lib/accounting/id-generator";
import { ok, error } from "@/lib/utils/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const ccId = formData.get("cc_id") as string | null;

    if (!file) return error("No file uploaded", 400);
    if (!ccId) return error("cc_id is required", 400);

    const cards = await readSheetAsObjects<CreditCard>(SHEETS.CreditCards);
    const card = cards.find((c) => c.CC_ID === ccId);
    if (!card) return error(`Credit card ${ccId} not found`, 404);

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    const dataLines = lines.slice(1);

    const rows: (string | number | boolean)[][] = [];
    const errors: string[] = [];
    const transactionIds: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const cols = dataLines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cols.length < 3) {
        errors.push(`Row ${i + 2}: Invalid format`);
        continue;
      }

      const [date, description, amountStr] = cols;
      const amount = parseFloat(amountStr?.replace(/[$,]/g, "") ?? "0") || 0;

      const cctId = await nextId(SHEETS.CCTransactions, "CCT_ID", ID_PREFIXES.CCTransaction);
      transactionIds.push(cctId);

      rows.push([
        cctId, ccId, date, description, amount,
        "", "", "", "FALSE", RecordStatus.Active, "",
        "", "", "", "", "", "", "",
      ]);
    }

    if (rows.length > 0) {
      await appendRows(SHEETS.CCTransactions, rows);
    }

    return ok({
      success: true,
      processed: rows.length,
      errors,
      transactionIds,
    });
  } catch (err) {
    console.error(err);
    return error("Failed to upload credit card statement");
  }
}
