import { NextRequest } from "next/server";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Payment } from "@/types/entities";
import { ok, error } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const payments = await readSheetAsObjects<Payment>(SHEETS.Payments);
    const payment = payments.find((p) => p.Payment_ID === id);
    if (!payment) throw new NotFoundError("Payment", id);
    return ok(payment);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to fetch payment");
  }
}
