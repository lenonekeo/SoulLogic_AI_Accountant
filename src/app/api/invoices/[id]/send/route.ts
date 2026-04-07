import { NextRequest } from "next/server";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { SalesInvoice, Client } from "@/types/entities";
import { sendEmail } from "@/lib/google/gmail";
import { ok, error } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const { email } = await req.json();

    const [invoices, clients] = await Promise.all([
      readSheetAsObjects<SalesInvoice>(SHEETS.SalesInvoices),
      readSheetAsObjects<Client>(SHEETS.Clients),
    ]);

    const invoice = invoices.find((i) => i.Invoice_ID === id);
    if (!invoice) throw new NotFoundError("Invoice", id);

    const client = clients.find((c) => c.Client_ID === invoice.Client_ID);
    const toEmail = email || client?.Email;
    if (!toEmail) return error("No email address specified or found for client", 400);

    const html = `
      <h2>Invoice ${invoice.Invoice_ID}</h2>
      <p>Dear ${client?.Company_Name ?? "Valued Customer"},</p>
      <p>Please find attached your invoice ${invoice.Invoice_ID} for <strong>$${Number(invoice.Total_Amount).toFixed(2)} CAD</strong>, due on ${invoice.Due_Date}.</p>
      ${invoice.PDF_URL ? `<p><a href="${invoice.PDF_URL}">View Invoice PDF</a></p>` : ""}
      <p>Thank you for your business.</p>
    `;

    await sendEmail(toEmail, `Invoice ${invoice.Invoice_ID}`, html);

    return ok({ success: true, sentTo: toEmail });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to send invoice");
  }
}
