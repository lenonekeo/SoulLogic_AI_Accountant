import { NextRequest } from "next/server";
import { readSheetAsObjects, updateById, clearRowById } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Item } from "@/types/entities";
import { ItemSchema } from "@/lib/validation/schemas";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const items = await readSheetAsObjects<Item>(SHEETS.Items);
    const item = items.find((i) => i.Item_ID === id);
    if (!item) throw new NotFoundError("Item", id);
    return ok(item);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to fetch item");
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await parseBody(req, ItemSchema);
    const items = await readSheetAsObjects<Item>(SHEETS.Items);
    const existing = items.find((i) => i.Item_ID === id);
    if (!existing) throw new NotFoundError("Item", id);

    const row = [
      id, body.Item_Name, body.Description ?? "",
      body.Unit_Price, body.Cost_Price, body.Tax_Rate,
      body.Account_Code, body.Category ?? "", body.Unit,
      existing.Is_Active ? "TRUE" : "FALSE",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];
    await updateById(SHEETS.Items, "Item_ID", id, row);
    return ok({ ...existing, ...body, Item_ID: id });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to update item");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const deleted = await clearRowById(SHEETS.Items, "Item_ID", id);
    if (!deleted) throw new NotFoundError("Item", id);
    return ok({ success: true });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to delete item");
  }
}
