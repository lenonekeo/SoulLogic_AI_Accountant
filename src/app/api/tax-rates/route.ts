import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { TaxRate } from "@/types/entities";
import { TaxRateSchema } from "@/lib/validation/schemas";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const province = searchParams.get("province");
    let rates = await readSheetAsObjects<TaxRate>(SHEETS.TaxRates);
    if (province) rates = rates.filter((r) => r.Province === province);
    return ok(rates);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch tax rates");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, TaxRateSchema);

    const row = [
      body.Tax_Code, body.Tax_Name, body.Rate, body.Province,
      body.Effective_Date, body.Expiry_Date ?? "",
      body.GL_Account_Code, "TRUE", body.Notes ?? "",
      "", "", "", "", "", "", "", "", // 8 dimension slots
    ];

    await appendRow(SHEETS.TaxRates, row);
    return ok({ ...body, Is_Active: true }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create tax rate");
  }
}
