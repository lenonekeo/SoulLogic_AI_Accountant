import { NextRequest } from "next/server";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { SubledgerEntry } from "@/types/entities";
import { ok, error } from "@/lib/utils/api-helpers";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const docType = searchParams.get("doc_type");
    const entity = searchParams.get("entity");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const dim1 = searchParams.get("dim1");
    const dim2 = searchParams.get("dim2");

    let entries = await readSheetAsObjects<SubledgerEntry>(SHEETS.Subledger);

    if (docType) entries = entries.filter((e) => e.Document_Type === docType);
    if (entity) entries = entries.filter((e) => e.Entity_ID === entity || e.Entity_Name?.toLowerCase().includes(entity.toLowerCase()));
    if (dateFrom) entries = entries.filter((e) => e.Posting_Date >= dateFrom);
    if (dateTo) entries = entries.filter((e) => e.Posting_Date <= dateTo);
    if (dim1) entries = entries.filter((e) => e.Dimension_1 === dim1);
    if (dim2) entries = entries.filter((e) => e.Dimension_2 === dim2);

    return ok(entries);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch subledger entries");
  }
}
