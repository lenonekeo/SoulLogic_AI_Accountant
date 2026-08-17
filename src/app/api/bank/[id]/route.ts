import { NextRequest } from "next/server";
import { readSheetAsObjects, updateById, clearRowById } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { BankAccount, BankTransaction } from "@/types/entities";
import { ok, error } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const [banks, transactions] = await Promise.all([
      readSheetAsObjects<BankAccount>(SHEETS.BankAccounts),
      readSheetAsObjects<BankTransaction>(SHEETS.BankTransactions),
    ]);
    const bank = banks.find((b) => b.Bank_ID === id);
    if (!bank) throw new NotFoundError("Bank Account", id);
    const txns = transactions.filter((t) => t.Bank_ID === id);
    return ok({ ...bank, transactions: txns });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to fetch bank account");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const deleted = await clearRowById(SHEETS.BankAccounts, "Bank_ID", id);
    if (!deleted) throw new NotFoundError("Bank Account", id);
    return ok({ success: true });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to delete bank account");
  }
}
