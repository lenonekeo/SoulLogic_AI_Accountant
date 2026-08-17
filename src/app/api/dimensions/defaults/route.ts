import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { DefaultDimension } from "@/types/entities";
import { ID_PREFIXES, ValuePostingRule } from "@/types/enums";
import { nextId } from "@/lib/accounting/id-generator";
import { ok, error } from "@/lib/utils/api-helpers";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get("table");
    const recordId = searchParams.get("record_id");

    let defaults = await readSheetAsObjects<DefaultDimension>(SHEETS.DefaultDimensions);
    if (table) defaults = defaults.filter((d) => d.Table_Name === table);
    if (recordId) defaults = defaults.filter((d) => d.Record_ID === recordId);
    return ok(defaults);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch default dimensions");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = await nextId(SHEETS.DefaultDimensions, "DefaultDim_ID", ID_PREFIXES.DefaultDimension);

    const row = [
      id, body.Table_Name, body.Record_ID, body.Dim_Slot,
      body.Dimension_Code, body.Value_Code,
      body.Value_Posting_Rule ?? ValuePostingRule.Blank,
      body.Notes ?? "",
    ];

    await appendRow(SHEETS.DefaultDimensions, row);
    return ok({ DefaultDim_ID: id, ...body }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create default dimension");
  }
}
