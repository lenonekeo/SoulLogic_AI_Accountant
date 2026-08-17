import { NextRequest } from "next/server";
import { readSheetAsObjects, clearRowById } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { CreditCard, CCTransaction } from "@/types/entities";
import { ok, error } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const [cards, transactions] = await Promise.all([
      readSheetAsObjects<CreditCard>(SHEETS.CreditCards),
      readSheetAsObjects<CCTransaction>(SHEETS.CCTransactions),
    ]);
    const card = cards.find((c) => c.CC_ID === id);
    if (!card) throw new NotFoundError("Credit Card", id);
    const txns = transactions.filter((t) => t.CC_ID === id);
    return ok({ ...card, transactions: txns });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to fetch credit card");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const deleted = await clearRowById(SHEETS.CreditCards, "CC_ID", id);
    if (!deleted) throw new NotFoundError("Credit Card", id);
    return ok({ success: true });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to delete credit card");
  }
}
