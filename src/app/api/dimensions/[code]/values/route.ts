import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { DimensionValue } from "@/types/entities";
import { ID_PREFIXES, DimensionValueType, ValuePostingRule } from "@/types/enums";
import { nextId } from "@/lib/accounting/id-generator";
import { ok, error } from "@/lib/utils/api-helpers";
import { today } from "@/lib/utils/date";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { code } = await params;
    const values = await readSheetAsObjects<DimensionValue>(SHEETS.DimensionValues);
    const filtered = values.filter((v) => v.Dimension_Code === code);
    return ok(filtered);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch dimension values");
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { code } = await params;
    const body = await req.json();

    const id = await nextId(SHEETS.DimensionValues, "DimValue_ID", ID_PREFIXES.DimensionValue);

    const row = [
      id, body.Dim_Slot, code,
      body.Value_Code, body.Value_Name,
      body.Parent_Value_Code ?? "",
      body.Dimension_Type ?? DimensionValueType.Standard,
      body.Totaling ?? "", body.Blocked ? "TRUE" : "FALSE",
      "TRUE", body.GL_Account_Filter ?? "", today(), body.Notes ?? "",
    ];

    await appendRow(SHEETS.DimensionValues, row);
    return ok({ DimValue_ID: id, Dimension_Code: code, ...body, Is_Active: true }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create dimension value");
  }
}
