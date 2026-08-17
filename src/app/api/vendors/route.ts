import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Vendor } from "@/types/entities";
import { ID_PREFIXES, RecordStatus, PaymentTerms } from "@/types/enums";
import { VendorSchema } from "@/lib/validation/schemas";
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
    let vendors = await readSheetAsObjects<Vendor>(SHEETS.Vendors);
    if (status) vendors = vendors.filter((v) => v.Status === status);
    return ok(vendors);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch vendors");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, VendorSchema);
    const vendorId = await nextId(SHEETS.Vendors, "Vendor_ID", ID_PREFIXES.Vendor);

    const row = [
      vendorId,
      body.Company_Name,
      body.Contact_Name ?? "",
      body.Email ?? "",
      body.Phone ?? "",
      body.Address ?? "",
      body.Tax_ID ?? "",
      body.Payment_Terms ?? PaymentTerms.Net30,
      body.Default_Category ?? "",
      0,
      RecordStatus.Active,
      today(),
      body.Notes ?? "",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];

    await appendRow(SHEETS.Vendors, row);
    return ok({ Vendor_ID: vendorId, ...body, Balance: 0, Status: RecordStatus.Active }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create vendor");
  }
}
