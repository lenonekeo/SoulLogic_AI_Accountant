import { NextRequest } from "next/server";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { PayrollEntry } from "@/types/entities";
import { ok, error } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const payroll = await readSheetAsObjects<PayrollEntry>(SHEETS.Payroll);
    const entry = payroll.find((p) => p.Payroll_ID === id);
    if (!entry) throw new NotFoundError("Payroll Entry", id);
    return ok(entry);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to fetch payroll entry");
  }
}
