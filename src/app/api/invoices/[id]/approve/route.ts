import { NextRequest } from "next/server";
import { readSheetAsObjects, updateById } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { SalesInvoice, LineItem, Client } from "@/types/entities";
import { InvoiceStatus, SourceInput, SourceModule, DocType, EntityType, ID_PREFIXES } from "@/types/enums";
import { postDocument } from "@/lib/accounting/posting";
import { uploadDocument } from "@/lib/google/drive";
import { generateInvoicePdf } from "@/lib/pdf/invoice-template";
import { ok, error } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";
import { today } from "@/lib/utils/date";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;

    const [invoices, clients] = await Promise.all([
      readSheetAsObjects<SalesInvoice>(SHEETS.SalesInvoices),
      readSheetAsObjects<Client>(SHEETS.Clients),
    ]);

    const invoice = invoices.find((i) => i.Invoice_ID === id);
    if (!invoice) throw new NotFoundError("Invoice", id);
    if (invoice.GL_Posted === true || String(invoice.GL_Posted) === "TRUE") {
      return error("Invoice is already posted", 400);
    }

    const client = clients.find((c) => c.Client_ID === invoice.Client_ID);
    const lineItems: LineItem[] = JSON.parse(String(invoice.Line_Items));

    // 1. Generate PDF
    const pdfBuffer = await generateInvoicePdf(invoice, client);

    // 2. Upload PDF to Google Drive
    const year = invoice.Invoice_Date.slice(0, 4);
    const pdfUrl = await uploadDocument(
      pdfBuffer,
      `${invoice.Invoice_ID}.pdf`,
      invoice.Client_ID,
      "Sales_Invoices",
      year
    );

    // 3. Build posting lines
    const lines = [];

    // AR Debit: Total Amount
    lines.push({
      accountCode: "1100",
      accountName: "Accounts Receivable",
      description: `Invoice ${invoice.Invoice_ID}`,
      debit: Number(invoice.Total_Amount),
      credit: 0,
      itemNo: "",
      itemDescription: `Invoice from ${client?.Company_Name ?? invoice.Client_ID}`,
      amount: Number(invoice.Total_Amount),
      taxCode: "",
      taxAmount: 0,
      dimensions: {},
    });

    // Revenue Credits: one per line item
    for (const li of lineItems) {
      lines.push({
        accountCode: "4010",
        accountName: "Service Revenue",
        description: li.Item_Name,
        debit: 0,
        credit: li.Amount,
        itemNo: li.Item_ID ?? "",
        itemDescription: li.Item_Name,
        qty: li.Qty,
        price: li.Unit_Price,
        amount: li.Amount,
        taxCode: li.Tax_Code ?? "",
        taxAmount: li.Tax_Amount,
        dimensions: Object.fromEntries(
          Object.entries({
            dim1: invoice.Dimension_1, dim2: invoice.Dimension_2,
            dim3: invoice.Dimension_3, dim4: invoice.Dimension_4,
            dim5: invoice.Dimension_5, dim6: invoice.Dimension_6,
            dim7: invoice.Dimension_7, dim8: invoice.Dimension_8,
          }).filter(([, v]) => v !== undefined)
        ) as Record<string, string>,
      });
    }

    // Tax Credits
    if (Number(invoice.Tax_Amount) > 0) {
      lines.push({
        accountCode: "2100",
        accountName: "GST/HST Payable",
        description: "Tax on Invoice",
        debit: 0,
        credit: Number(invoice.Tax_Amount),
        itemNo: "",
        itemDescription: "Tax",
        amount: Number(invoice.Tax_Amount),
        taxCode: "TAX",
        taxAmount: Number(invoice.Tax_Amount),
        dimensions: {},
      });
    }

    // 4. Post to Subledger + GL
    const postResult = await postDocument({
      documentNo: invoice.Invoice_ID,
      documentDate: invoice.Invoice_Date,
      postingDate: today(),
      documentType: DocType.SalesInvoice,
      entityType: EntityType.Client,
      entityId: invoice.Client_ID,
      entityName: client?.Company_Name ?? invoice.Client_ID,
      sourceModule: SourceModule.Sales,
      sourceInput: SourceInput.WebApp,
      sourceDocUrl: pdfUrl,
      clientId: invoice.Client_ID,
      postedBy: "System",
      notes: invoice.Notes,
      lines,
    });

    // 5. Update invoice: Status, GL_Posted, PDF_URL, Approved
    const updatedRow = [
      invoice.Invoice_ID, invoice.Client_ID,
      invoice.Invoice_Date, invoice.Due_Date,
      invoice.Line_Items,
      invoice.Subtotal, invoice.Tax_Amount, invoice.Total_Amount,
      invoice.Amount_Paid, invoice.Balance_Due,
      InvoiceStatus.Approved, "TRUE", pdfUrl,
      invoice.Notes ?? "", invoice.Created_By ?? "System",
      "System", today(),
      invoice.Dimension_1 ?? "", invoice.Dimension_2 ?? "",
      invoice.Dimension_3 ?? "", invoice.Dimension_4 ?? "",
      invoice.Dimension_5 ?? "", invoice.Dimension_6 ?? "",
      invoice.Dimension_7 ?? "", invoice.Dimension_8 ?? "",
    ];

    await updateById(SHEETS.SalesInvoices, "Invoice_ID", id, updatedRow);

    return ok({
      success: true,
      invoiceId: id,
      pdfUrl,
      ...postResult,
    });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error(err instanceof Error ? err.message : "Failed to approve invoice");
  }
}
