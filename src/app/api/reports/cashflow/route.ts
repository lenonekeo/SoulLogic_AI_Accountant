import { NextRequest } from "next/server";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { SalesReceipt, Payment, BankTransaction } from "@/types/entities";
import { ok, error } from "@/lib/utils/api-helpers";
import { roundMoney } from "@/lib/utils/currency";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().getFullYear() + "-01-01";
    const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0];

    const [receipts, payments] = await Promise.all([
      readSheetAsObjects<SalesReceipt>(SHEETS.SalesReceipts),
      readSheetAsObjects<Payment>(SHEETS.Payments),
    ]);

    const periodReceipts = receipts.filter(
      (r) => r.Receipt_Date >= from && r.Receipt_Date <= to && String(r.GL_Posted) === "TRUE"
    );
    const periodPayments = payments.filter(
      (p) => p.Payment_Date >= from && p.Payment_Date <= to && String(p.GL_Posted) === "TRUE"
    );

    const totalReceipts = roundMoney(periodReceipts.reduce((s, r) => s + Number(r.Amount), 0));
    const totalPayments = roundMoney(periodPayments.reduce((s, p) => s + Number(p.Amount), 0));

    type CashFlowDetail = { date: string; description: string; amount: number; balance: number };
    const details: CashFlowDetail[] = [];
    let runningBalance = 0;

    const allItems = [
      ...periodReceipts.map((r) => ({ date: r.Receipt_Date, description: `Receipt ${r.Receipt_ID}`, amount: Number(r.Amount) })),
      ...periodPayments.map((p) => ({ date: p.Payment_Date, description: `Payment ${p.Payment_ID}`, amount: -Number(p.Amount) })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    for (const item of allItems) {
      runningBalance = roundMoney(runningBalance + item.amount);
      details.push({ ...item, balance: runningBalance });
    }

    return ok({
      period: { from, to },
      openingBalance: 0,
      receipts: totalReceipts,
      payments: totalPayments,
      closingBalance: roundMoney(totalReceipts - totalPayments),
      details,
    });
  } catch (err) {
    console.error(err);
    return error("Failed to generate cash flow report");
  }
}
