import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Item } from "@/types/entities";
import { ID_PREFIXES } from "@/types/enums";
import { ItemSchema } from "@/lib/validation/schemas";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active");
    let items = await readSheetAsObjects<Item>(SHEETS.Items);
    if (active === "true") items = items.filter((i) => String(i.Is_Active) === "TRUE" || i.Is_Active === true);
    return ok(items);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch items");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, ItemSchema);
    const itemId = await nextId(SHEETS.Items, "Item_ID", ID_PREFIXES.Item);

    const row = [
      itemId, body.Item_Name, body.Description ?? "",
      body.Unit_Price, body.Cost_Price, body.Tax_Rate,
      body.Account_Code, body.Category ?? "", body.Unit, "TRUE",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];

    await appendRow(SHEETS.Items, row);
    return ok({ Item_ID: itemId, ...body, Is_Active: true }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create item");
  }
}
