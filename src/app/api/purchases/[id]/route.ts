import { NextRequest } from "next/server";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { PurchaseInvoice } from "@/types/entities";
import { ok, error } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const purchases = await readSheetAsObjects<PurchaseInvoice>(SHEETS.PurchaseInvoices);
    const purchase = purchases.find((p) => p.PurchInv_ID === id);
    if (!purchase) throw new NotFoundError("Purchase Invoice", id);
    return ok(purchase);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to fetch purchase invoice");
  }
}
