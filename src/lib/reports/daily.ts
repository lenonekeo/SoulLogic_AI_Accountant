import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { SalesInvoice, PurchaseInvoice, SalesReceipt, Payment } from "@/types/entities";
import { roundMoney } from "@/lib/utils/currency";

export interface DailySummary {
  date: string;
  summary: {
    invoicesCreated: number;
    totalSales: number;
    purchasesReceived: number;
    totalPurchases: number;
    receiptsRecorded: number;
    totalReceived: number;
    paymentsMade: number;
    totalPaid: number;
    netCashFlow: number;
  };
  overdueAR: {
    count: number;
    total: number;
  };
}

/**
 * Daily figures for whichever tenant is in context. Shared by the report API
 * and the digest cron so the two can't drift apart.
 */
export async function buildDailySummary(date: string): Promise<DailySummary> {
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

  const overdueAR = invoices.filter((i) => Number(i.Balance_Due) > 0 && i.Due_Date < date);
  const totalOverdueAR = roundMoney(overdueAR.reduce((s, i) => s + Number(i.Balance_Due), 0));

  return {
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
  };
}
