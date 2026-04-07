import { NextRequest } from "next/server";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { SalesInvoice, PurchaseInvoice, Client, Vendor } from "@/types/entities";
import { ok, error } from "@/lib/utils/api-helpers";
import { roundMoney } from "@/lib/utils/currency";
import { daysBetween } from "@/lib/utils/date";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "ar") as "ar" | "ap";
    const asOf = searchParams.get("as_of") ?? new Date().toISOString().split("T")[0];

    type AgingRow = { entity: string; current: number; days30: number; days60: number; days90: number; over90: number; total: number };
    const rows: Record<string, AgingRow> = {};

    if (type === "ar") {
      const [invoices, clients] = await Promise.all([
        readSheetAsObjects<SalesInvoice>(SHEETS.SalesInvoices),
        readSheetAsObjects<Client>(SHEETS.Clients),
      ]);
      const clientMap: Record<string, string> = {};
      for (const c of clients) clientMap[c.Client_ID] = c.Company_Name;

      const outstanding = invoices.filter((i) => Number(i.Balance_Due) > 0 && i.Invoice_Date <= asOf);

      for (const inv of outstanding) {
        const name = clientMap[inv.Client_ID] ?? inv.Client_ID;
        const days = daysBetween(inv.Due_Date, asOf);
        const balance = Number(inv.Balance_Due);

        if (!rows[inv.Client_ID]) {
          rows[inv.Client_ID] = { entity: name, current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
        }

        if (days <= 0) rows[inv.Client_ID].current += balance;
        else if (days <= 30) rows[inv.Client_ID].days30 += balance;
        else if (days <= 60) rows[inv.Client_ID].days60 += balance;
        else if (days <= 90) rows[inv.Client_ID].days90 += balance;
        else rows[inv.Client_ID].over90 += balance;
        rows[inv.Client_ID].total = roundMoney(rows[inv.Client_ID].current + rows[inv.Client_ID].days30 + rows[inv.Client_ID].days60 + rows[inv.Client_ID].days90 + rows[inv.Client_ID].over90);
      }
    } else {
      const [purchases, vendors] = await Promise.all([
        readSheetAsObjects<PurchaseInvoice>(SHEETS.PurchaseInvoices),
        readSheetAsObjects<Vendor>(SHEETS.Vendors),
      ]);
      const vendorMap: Record<string, string> = {};
      for (const v of vendors) vendorMap[v.Vendor_ID] = v.Company_Name;

      const outstanding = purchases.filter((p) => Number(p.Balance_Due) > 0 && p.Invoice_Date <= asOf);

      for (const pur of outstanding) {
        const name = vendorMap[pur.Vendor_ID] ?? pur.Vendor_ID;
        const days = daysBetween(pur.Due_Date, asOf);
        const balance = Number(pur.Balance_Due);

        if (!rows[pur.Vendor_ID]) {
          rows[pur.Vendor_ID] = { entity: name, current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
        }

        if (days <= 0) rows[pur.Vendor_ID].current += balance;
        else if (days <= 30) rows[pur.Vendor_ID].days30 += balance;
        else if (days <= 60) rows[pur.Vendor_ID].days60 += balance;
        else if (days <= 90) rows[pur.Vendor_ID].days90 += balance;
        else rows[pur.Vendor_ID].over90 += balance;
        rows[pur.Vendor_ID].total = roundMoney(rows[pur.Vendor_ID].current + rows[pur.Vendor_ID].days30 + rows[pur.Vendor_ID].days60 + rows[pur.Vendor_ID].days90 + rows[pur.Vendor_ID].over90);
      }
    }

    const agingRows = Object.values(rows).sort((a, b) => b.total - a.total);
    const totals = agingRows.reduce(
      (acc, r) => ({
        current: roundMoney(acc.current + r.current),
        days30: roundMoney(acc.days30 + r.days30),
        days60: roundMoney(acc.days60 + r.days60),
        days90: roundMoney(acc.days90 + r.days90),
        over90: roundMoney(acc.over90 + r.over90),
        total: roundMoney(acc.total + r.total),
      }),
      { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 }
    );

    return ok({ type, asOf, rows: agingRows, totals });
  } catch (err) {
    console.error(err);
    return error("Failed to generate aging report");
  }
}
