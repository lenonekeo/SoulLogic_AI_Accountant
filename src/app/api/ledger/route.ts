import { NextRequest } from "next/server";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { GLEntry } from "@/types/entities";
import { ok, error } from "@/lib/utils/api-helpers";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const account = searchParams.get("account");
    const dim1 = searchParams.get("dim1");
    const dim2 = searchParams.get("dim2");

    let entries = await readSheetAsObjects<GLEntry>(SHEETS.GeneralLedger);

    if (dateFrom) entries = entries.filter((e) => e.Date >= dateFrom);
    if (dateTo) entries = entries.filter((e) => e.Date <= dateTo);
    if (account) entries = entries.filter((e) => e.Account_Code === account);
    if (dim1) entries = entries.filter((e) => e.Dimension_1 === dim1);
    if (dim2) entries = entries.filter((e) => e.Dimension_2 === dim2);

    return ok(entries);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch ledger entries");
  }
}
