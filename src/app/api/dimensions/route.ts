import { NextRequest } from "next/server";
import { readSheetAsObjects, updateById } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Dimension } from "@/types/entities";
import { ok, error } from "@/lib/utils/api-helpers";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dimensions = await readSheetAsObjects<Dimension>(SHEETS.Dimensions);
    return ok(dimensions);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch dimensions");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: Dimension[] = await req.json();

    for (const dim of body) {
      const row = [
        dim.Dim_Slot, dim.Dimension_Code, dim.Dimension_Name,
        dim.Description ?? "", dim.Is_Required ? "TRUE" : "FALSE",
        dim.Is_Active ? "TRUE" : "FALSE",
        dim.Default_Value ?? "", dim.Blocking_Rule ?? "",
        dim.Created_Date, dim.Notes ?? "",
      ];
      await updateById(SHEETS.Dimensions, "Dimension_Code", dim.Dimension_Code, row);
    }

    return ok({ success: true, updated: body.length });
  } catch (err) {
    console.error(err);
    return error("Failed to update dimensions");
  }
}
