import { NextRequest } from "next/server";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { SalesInvoice, PurchaseInvoice, SalesReceipt, Payment } from "@/types/entities";
import { ok, error } from "@/lib/utils/api-helpers";
import { roundMoney } from "@/lib/utils/currency";
import { today } from "@/lib/utils/date";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? today();

    const [invoices, purchases, receipts, payments] = await Promise.all([
      readSheetAsObjects<SalesInvoice>(SHEETS.SalesInvoices),
      readSheetAsObjects<PurchaseInvoice>(SHEETS.PurchaseInvoices),
      readSheetAsObjects<SalesReceipt>(SHEETS.SalesReceipts),
      readSheetAsObjects<Payment>(SHEETS.Payments),
    ]);

    const dayInvoices = invoices.filter((i) => i.Invoice_Date === date);
    const dayPurchases = purchases.filter((p) => p.Invoice_Date === date || p.Received_Date === date);
    const dayReceipts = receipts.filter((r) => r.Receipt_Date === date);
    const dayPayments = payments.filter((p) => p.Payment_Date === date);

    const totalSales = roundMoney(dayInvoices.reduce((s, i) => s + Number(i.Total_Amount), 0));
    const totalPurchases = roundMoney(dayPurchases.reduce((s, p) => s + Number(p.Total_Amount), 0));
    const totalReceived = roundMoney(dayReceipts.reduce((s, r) => s + Number(r.Amount), 0));
    const totalPaid = roundMoney(dayPayments.reduce((s, p) => s + Number(p.Amount), 0));

    // Overdue AR
    const overdueAR = invoices.filter((i) => Number(i.Balance_Due) > 0 && i.Due_Date < date);
    const totalOverdueAR = roundMoney(overdueAR.reduce((s, i) => s + Number(i.Balance_Due), 0));

    return ok({
      date,
      summary: {
        invoicesCreated: dayInvoices.length,
        totalSales,
        purchasesReceived: dayPurchases.length,
        totalPurchases,
        receiptsRecorded: dayReceipts.length,
        totalReceived,
        paymentsMade: dayPayments.length,
        totalPaid,
        netCashFlow: roundMoney(totalReceived - totalPaid),
      },
      overdueAR: {
        count: overdueAR.length,
        total: totalOverdueAR,
      },
    });
  } catch (err) {
    console.error(err);
    return error("Failed to generate daily report");
  }
}
