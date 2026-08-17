import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { getTenant } from "@/lib/tenant/context";
import { fuzzyMatch } from "@/lib/voice/fuzzy-match";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { SHEETS } from "@/types/sheets";
import { Vendor } from "@/types/entities";
import { ID_PREFIXES, PaymentTerms, RecordStatus } from "@/types/enums";
import { today } from "@/lib/utils/date";

export interface ResolvedVendor {
  vendorId: string;
  vendorName: string;
  /** How the id was arrived at — surfaced so callers can log or review it. */
  via: "matched" | "created" | "unnamed";
}

/**
 * Map an extracted vendor name to a Vendor_ID.
 *
 * Matching is fuzzy because the same vendor arrives spelled differently across
 * receipts ("SUSHI PALACE STE-ROSE" vs "Sushi Palace Ste-Rose"); an exact
 * comparison would file each variant as a separate vendor. Only when nothing
 * matches is a vendor created, so the ledger ends up with one row per real
 * counterparty rather than one per receipt.
 */
export async function resolveVendor(vendorName: string | null | undefined): Promise<ResolvedVendor> {
  const name = vendorName?.trim();
  if (!name) return { vendorId: "", vendorName: "", via: "unnamed" };

  const vendors = await readSheetAsObjects<Vendor>(SHEETS.Vendors);
  const match = fuzzyMatch(
    name,
    vendors
      .filter((v) => v.Company_Name)
      .map((v) => ({ id: v.Vendor_ID, name: v.Company_Name }))
  );
  if (match) return { vendorId: match.id, vendorName: match.name, via: "matched" };

  const tenant = await getTenant();
  const vendorId = await nextId(SHEETS.Vendors, "Vendor_ID", ID_PREFIXES.Vendor);
  await appendRow(SHEETS.Vendors, [
    vendorId,
    name,                       // Company_Name
    "",                         // Contact_Name
    "",                         // Email
    "",                         // Phone
    "",                         // Address
    "",                         // Tax_ID
    PaymentTerms.Net30,
    "",                         // Default_Category
    0,                          // Balance
    RecordStatus.Active,
    today(),
    "Created automatically from an incoming invoice.",
    ...dimensionArray({}, tenant.accountNo),
  ]);

  return { vendorId, vendorName: name, via: "created" };
}
