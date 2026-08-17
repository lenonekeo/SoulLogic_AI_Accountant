import { NextRequest } from "next/server";
import { readSheetAsObjects, updateById } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { PurchaseInvoice, PurchaseLineItem, Vendor } from "@/types/entities";
import { PurchaseStatus, SourceInput, SourceModule, DocType, EntityType } from "@/types/enums";
import { postDocument } from "@/lib/accounting/posting";
import { ok, error } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";
import { today } from "@/lib/utils/date";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;

    const [purchases, vendors] = await Promise.all([
      readSheetAsObjects<PurchaseInvoice>(SHEETS.PurchaseInvoices),
      readSheetAsObjects<Vendor>(SHEETS.Vendors),
    ]);

    const purchase = purchases.find((p) => p.PurchInv_ID === id);
    if (!purchase) throw new NotFoundError("Purchase Invoice", id);
    if (String(purchase.GL_Posted) === "TRUE") return error("Purchase invoice already posted", 400);

    const vendor = vendors.find((v) => v.Vendor_ID === purchase.Vendor_ID);
    const lineItems: PurchaseLineItem[] = JSON.parse(String(purchase.Line_Items));

    // Source doc URL is required — must be set before calling approve
    const sourceDocUrl = purchase.PDF_URL;
    if (!sourceDocUrl) return error("Source document URL (PDF) is required before approving. Upload the document first.", 400);

    const lines = [];

    // Expense Debits
    for (const li of lineItems) {
      lines.push({
        accountCode: li.Account_Code || "5000",
        accountName: "Expense",
        description: li.Description,
        debit: li.Amount,
        credit: 0,
        itemDescription: li.Description,
        qty: li.Qty,
        price: li.Unit_Price,
        amount: li.Amount,
        taxCode: li.Tax_Code ?? "",
        taxAmount: li.Tax_Amount,
        dimensions: Object.fromEntries(
          Object.entries({
            dim1: purchase.Dimension_1, dim2: purchase.Dimension_2,
            dim3: purchase.Dimension_3, dim4: purchase.Dimension_4,
            dim5: purchase.Dimension_5, dim6: purchase.Dimension_6,
            dim7: purchase.Dimension_7, dim8: purchase.Dimension_8,
          }).filter(([, v]) => v !== undefined)
        ) as Record<string, string>,
      });
    }

    // Tax Debit (Input Tax Credits)
    if (Number(purchase.Tax_Amount) > 0) {
      lines.push({
        accountCode: "2100",
        accountName: "GST/HST Receivable",
        description: "Input Tax Credit",
        debit: Number(purchase.Tax_Amount),
        credit: 0,
        itemDescription: "Tax",
        amount: Number(purchase.Tax_Amount),
        taxCode: "ITC",
        taxAmount: Number(purchase.Tax_Amount),
        dimensions: {},
      });
    }

    // AP Credit
    lines.push({
      accountCode: "2000",
      accountName: "Accounts Payable",
      description: `PO ${purchase.PurchInv_ID}`,
      debit: 0,
      credit: Number(purchase.Total_Amount),
      itemDescription: `Purchase from ${vendor?.Company_Name ?? purchase.Vendor_ID}`,
      amount: Number(purchase.Total_Amount),
      taxCode: "",
      taxAmount: 0,
      dimensions: {},
    });

    const postResult = await postDocument({
      documentNo: purchase.PurchInv_ID,
      documentDate: purchase.Invoice_Date,
      postingDate: today(),
      documentType: DocType.PurchaseInvoice,
      entityType: EntityType.Vendor,
      entityId: purchase.Vendor_ID,
      entityName: vendor?.Company_Name ?? purchase.Vendor_ID,
      sourceModule: SourceModule.Purchase,
      sourceInput: SourceInput.WebApp,
      sourceDocUrl,
      postedBy: "System",
      lines,
    });

    const updatedRow = [
      purchase.PurchInv_ID, purchase.Vendor_ID, purchase.Vendor_Invoice_No ?? "",
      purchase.Invoice_Date, purchase.Due_Date, purchase.Line_Items,
      purchase.Subtotal, purchase.Tax_Amount, purchase.Total_Amount,
      purchase.Amount_Paid, purchase.Balance_Due,
      PurchaseStatus.Approved, "TRUE", sourceDocUrl,
      purchase.Document_Name ?? "", purchase.Source_Email ?? "", purchase.Received_Date ?? "",
      "System", today(), purchase.Notes ?? "",
      purchase.Dimension_1 ?? "", purchase.Dimension_2 ?? "",
      purchase.Dimension_3 ?? "", purchase.Dimension_4 ?? "",
      purchase.Dimension_5 ?? "", purchase.Dimension_6 ?? "",
      purchase.Dimension_7 ?? "", purchase.Dimension_8 ?? "",
    ];

    await updateById(SHEETS.PurchaseInvoices, "PurchInv_ID", id, updatedRow);
    return ok({ success: true, purchaseId: id, ...postResult });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error(err instanceof Error ? err.message : "Failed to approve purchase invoice");
  }
}
