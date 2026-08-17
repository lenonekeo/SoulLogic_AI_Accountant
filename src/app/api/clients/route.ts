import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Client } from "@/types/entities";
import { ID_PREFIXES, RecordStatus, PaymentTerms } from "@/types/enums";
import { ClientSchema } from "@/lib/validation/schemas";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";
import { today } from "@/lib/utils/date";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let clients = await readSheetAsObjects<Client>(SHEETS.Clients);

    if (status) {
      clients = clients.filter((c) => c.Status === status);
    }

    return ok(clients);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch clients");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, ClientSchema);
    const clientId = await nextId(SHEETS.Clients, "Client_ID", ID_PREFIXES.Client);

    const row = [
      clientId,
      body.Company_Name,
      body.Contact_Name ?? "",
      body.Email ?? "",
      body.Phone ?? "",
      body.Address ?? "",
      body.Tax_ID ?? "",
      body.Payment_Terms ?? PaymentTerms.Net30,
      0, // Balance
      RecordStatus.Active,
      today(),
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

    await appendRow(SHEETS.Clients, row);

    const newClient: Partial<Client> = { Client_ID: clientId, ...body, Balance: 0, Status: RecordStatus.Active };
    return ok(newClient, 201);
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return error(`Failed to create client: ${msg}`);
  }
}
