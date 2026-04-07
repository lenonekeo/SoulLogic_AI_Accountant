import { NextRequest } from "next/server";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { GLEntry } from "@/types/entities";
import { AccountType } from "@/types/enums";
import { ok, error } from "@/lib/utils/api-helpers";
import { roundMoney } from "@/lib/utils/currency";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().getFullYear() + "-01-01";
    const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0];
    const dim1 = searchParams.get("dim1");
    const dim2 = searchParams.get("dim2");

    let entries = await readSheetAsObjects<GLEntry>(SHEETS.GeneralLedger);

    // Filter by date
    entries = entries.filter((e) => e.Date >= from && e.Date <= to);
    if (dim1) entries = entries.filter((e) => e.Dimension_1 === dim1);
    if (dim2) entries = entries.filter((e) => e.Dimension_2 === dim2);

    const revenueMap: Record<string, { account: string; name: string; amount: number }> = {};
    const expenseMap: Record<string, { account: string; name: string; amount: number }> = {};

    // Read CoA for account types
    const coa = await readSheetAsObjects<{ Account_Code: string; Account_Name: string; Account_Type: string }>(SHEETS.ChartOfAccounts);
    const accountTypeMap: Record<string, string> = {};
    for (const a of coa) {
      accountTypeMap[a.Account_Code] = a.Account_Type;
    }

    for (const entry of entries) {
      const accountType = accountTypeMap[entry.Account_Code];
      const net = roundMoney(Number(entry.Credit) - Number(entry.Debit));

      if (accountType === AccountType.Revenue) {
        if (!revenueMap[entry.Account_Code]) {
          revenueMap[entry.Account_Code] = { account: entry.Account_Code, name: entry.Account_Name, amount: 0 };
        }
        revenueMap[entry.Account_Code].amount = roundMoney(revenueMap[entry.Account_Code].amount + net);
      } else if (accountType === AccountType.Expense) {
        const expenseNet = roundMoney(Number(entry.Debit) - Number(entry.Credit));
        if (!expenseMap[entry.Account_Code]) {
          expenseMap[entry.Account_Code] = { account: entry.Account_Code, name: entry.Account_Name, amount: 0 };
        }
        expenseMap[entry.Account_Code].amount = roundMoney(expenseMap[entry.Account_Code].amount + expenseNet);
      }
    }

    const revenue = Object.values(revenueMap).sort((a, b) => a.account.localeCompare(b.account));
    const expenses = Object.values(expenseMap).sort((a, b) => a.account.localeCompare(b.account));
    const totalRevenue = roundMoney(revenue.reduce((s, r) => s + r.amount, 0));
    const totalExpenses = roundMoney(expenses.reduce((s, e) => s + e.amount, 0));
    const netIncome = roundMoney(totalRevenue - totalExpenses);

    return ok({ period: { from, to }, revenue, expenses, totalRevenue, totalExpenses, netIncome });
  } catch (err) {
    console.error(err);
    return error("Failed to generate P&L report");
  }
}
