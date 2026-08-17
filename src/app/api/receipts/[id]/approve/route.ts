import { NextRequest } from "next/server";
import { readSheetAsObjects, updateById } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { SalesReceipt, Client } from "@/types/entities";
import { ReceiptStatus, SourceInput, SourceModule, DocType, EntityType } from "@/types/enums";
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

    const [receipts, clients] = await Promise.all([
      readSheetAsObjects<SalesReceipt>(SHEETS.SalesReceipts),
      readSheetAsObjects<Client>(SHEETS.Clients),
    ]);

    const receipt = receipts.find((r) => r.Receipt_ID === id);
    if (!receipt) throw new NotFoundError("Receipt", id);
    if (String(receipt.GL_Posted) === "TRUE") return error("Receipt already posted", 400);

    const sourceDocUrl = receipt.Source_Doc_URL;
    if (!sourceDocUrl) return error("Source document URL is required before approving", 400);

    const client = clients.find((c) => c.Client_ID === receipt.Client_ID);

    const lines = [
      {
        accountCode: receipt.Bank_ID ? "1000" : "1000",
        accountName: "Cash",
        description: `Receipt ${receipt.Receipt_ID}`,
        debit: Number(receipt.Amount),
        credit: 0,
        itemDescription: `Payment from ${client?.Company_Name ?? receipt.Client_ID}`,
        amount: Number(receipt.Amount),
        taxCode: "",
        taxAmount: 0,
        dimensions: {},
      },
      {
        accountCode: "1100",
        accountName: "Accounts Receivable",
        description: `Receipt applied to ${receipt.Invoice_ID ?? "open balance"}`,
        debit: 0,
        credit: Number(receipt.Amount),
        itemDescription: "AR reduction",
        amount: Number(receipt.Amount),
        taxCode: "",
        taxAmount: 0,
        dimensions: {},
      },
    ];

    const postResult = await postDocument({
      documentNo: receipt.Receipt_ID,
      documentDate: receipt.Receipt_Date,
      postingDate: today(),
      documentType: DocType.SalesCashReceipt,
      entityType: EntityType.Client,
      entityId: receipt.Client_ID,
      entityName: client?.Company_Name ?? receipt.Client_ID,
      sourceModule: SourceModule.Receipt,
      sourceInput: SourceInput.WebApp,
      sourceDocUrl,
      clientId: receipt.Client_ID,
      postedBy: "System",
      lines,
    });

    const updatedRow = [
      receipt.Receipt_ID, receipt.Client_ID, receipt.Invoice_ID ?? "",
      receipt.Receipt_Date, receipt.Amount, receipt.Payment_Method,
      receipt.Reference_Number ?? "", receipt.Bank_ID ?? "",
      ReceiptStatus.Completed, "TRUE", "TRUE", sourceDocUrl, receipt.Notes ?? "",
      receipt.Dimension_1 ?? "", receipt.Dimension_2 ?? "",
      receipt.Dimension_3 ?? "", receipt.Dimension_4 ?? "",
      receipt.Dimension_5 ?? "", receipt.Dimension_6 ?? "",
      receipt.Dimension_7 ?? "", receipt.Dimension_8 ?? "",
    ];

    await updateById(SHEETS.SalesReceipts, "Receipt_ID", id, updatedRow);
    return ok({ success: true, receiptId: id, ...postResult });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error(err instanceof Error ? err.message : "Failed to approve receipt");
  }
}
