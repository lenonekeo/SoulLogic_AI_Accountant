import { NextRequest } from "next/server";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { SalesReceipt } from "@/types/entities";
import { ok, error } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const receipts = await readSheetAsObjects<SalesReceipt>(SHEETS.SalesReceipts);
    const receipt = receipts.find((r) => r.Receipt_ID === id);
    if (!receipt) throw new NotFoundError("Receipt", id);
    return ok(receipt);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to fetch receipt");
  }
}
