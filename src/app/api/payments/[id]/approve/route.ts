import { NextRequest } from "next/server";
import { readSheetAsObjects, updateById } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Payment, Vendor } from "@/types/entities";
import { PaymentStatus, SourceInput, SourceModule, DocType, EntityType } from "@/types/enums";
import { postDocument } from "@/lib/accounting/posting";
import { ok, error } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";
import { today } from "@/lib/utils/date";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;

    const [payments, vendors] = await Promise.all([
      readSheetAsObjects<Payment>(SHEETS.Payments),
      readSheetAsObjects<Vendor>(SHEETS.Vendors),
    ]);

    const payment = payments.find((p) => p.Payment_ID === id);
    if (!payment) throw new NotFoundError("Payment", id);
    if (String(payment.GL_Posted) === "TRUE") return error("Payment already posted", 400);

    const sourceDocUrl = payment.Source_Doc_URL;
    if (!sourceDocUrl) return error("Source document URL is required before approving", 400);

    const vendor = vendors.find((v) => v.Vendor_ID === payment.Vendor_ID);

    const lines = [
      {
        accountCode: "2000",
        accountName: "Accounts Payable",
        description: `Payment ${payment.Payment_ID}`,
        debit: Number(payment.Amount),
        credit: 0,
        itemDescription: `Payment to ${vendor?.Company_Name ?? payment.Vendor_ID}`,
        amount: Number(payment.Amount),
        taxCode: "",
        taxAmount: 0,
        dimensions: {},
      },
      {
        accountCode: "1000",
        accountName: "Cash",
        description: `Payment ${payment.Payment_ID}`,
        debit: 0,
        credit: Number(payment.Amount),
        itemDescription: "Bank disbursement",
        amount: Number(payment.Amount),
        taxCode: "",
        taxAmount: 0,
        dimensions: {},
      },
    ];

    const postResult = await postDocument({
      documentNo: payment.Payment_ID,
      documentDate: payment.Payment_Date,
      postingDate: today(),
      documentType: DocType.PurchasePayment,
      entityType: EntityType.Vendor,
      entityId: payment.Vendor_ID,
      entityName: vendor?.Company_Name ?? payment.Vendor_ID,
      sourceModule: SourceModule.Payment,
      sourceInput: SourceInput.WebApp,
      sourceDocUrl,
      postedBy: "System",
      lines,
    });

    const updatedRow = [
      payment.Payment_ID, payment.PurchInv_ID, payment.Vendor_ID,
      payment.Payment_Date, payment.Amount, payment.Payment_Method,
      payment.Reference_Number ?? "",
      PaymentStatus.Completed, "TRUE", "TRUE", sourceDocUrl, payment.Notes ?? "",
      payment.Dimension_1 ?? "", payment.Dimension_2 ?? "",
      payment.Dimension_3 ?? "", payment.Dimension_4 ?? "",
      payment.Dimension_5 ?? "", payment.Dimension_6 ?? "",
      payment.Dimension_7 ?? "", payment.Dimension_8 ?? "",
    ];

    await updateById(SHEETS.Payments, "Payment_ID", id, updatedRow);
    return ok({ success: true, paymentId: id, ...postResult });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error(err instanceof Error ? err.message : "Failed to approve payment");
  }
}
