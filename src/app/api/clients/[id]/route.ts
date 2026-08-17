import { NextRequest } from "next/server";
import { readSheetAsObjects, updateById, clearRowById } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Client } from "@/types/entities";
import { PaymentTerms } from "@/types/enums";
import { ClientSchema } from "@/lib/validation/schemas";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const clients = await readSheetAsObjects<Client>(SHEETS.Clients);
    const client = clients.find((c) => c.Client_ID === id);
    if (!client) throw new NotFoundError("Client", id);
    return ok(client);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to fetch client");
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await parseBody(req, ClientSchema);

    const clients = await readSheetAsObjects<Client>(SHEETS.Clients);
    const existing = clients.find((c) => c.Client_ID === id);
    if (!existing) throw new NotFoundError("Client", id);

    const row = [
      id,
      body.Company_Name,
      body.Contact_Name ?? "",
      body.Email ?? "",
      body.Phone ?? "",
      body.Address ?? "",
      body.Tax_ID ?? "",
      body.Payment_Terms ?? PaymentTerms.Net30,
      existing.Balance,
      existing.Status,
      existing.Created_Date,
      body.Notes ?? "",
      ...dimensionArray({
        Dimension_1: body.Dimension_1,
        Dimension_2: body.Dimension_2,
        Dimension_3: body.Dimension_3,
        Dimension_4: body.Dimension_4,
        Dimension_5: body.Dimension_5,
        Dimension_6: body.Dimension_6,
        Dimension_7: body.Dimension_7,
        Dimension_8: body.Dimension_8,
      }),
    ];

    await updateById(SHEETS.Clients, "Client_ID", id, row);
    return ok({ ...existing, ...body, Client_ID: id });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to update client");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const deleted = await clearRowById(SHEETS.Clients, "Client_ID", id);
    if (!deleted) throw new NotFoundError("Client", id);
    return ok({ success: true });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to delete client");
  }
}
