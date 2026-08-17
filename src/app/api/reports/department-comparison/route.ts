import { NextRequest } from "next/server";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { GLEntry } from "@/types/entities";
import { AccountType } from "@/types/enums";
import { ok, error } from "@/lib/utils/api-helpers";
import { roundMoney } from "@/lib/utils/currency";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().getFullYear() + "-01-01";
    const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0];

    let entries = await readSheetAsObjects<GLEntry>(SHEETS.GeneralLedger);
    entries = entries.filter((e) => e.Date >= from && e.Date <= to);

    const coa = await readSheetAsObjects<{ Account_Code: string; Account_Type: string }>(SHEETS.ChartOfAccounts);
    const accountTypeMap: Record<string, string> = {};
    for (const a of coa) accountTypeMap[a.Account_Code] = a.Account_Type;

    type DeptData = { department: string; revenue: number; expenses: number; netIncome: number };
    const deptMap: Record<string, DeptData> = {};

    for (const entry of entries) {
      const dept = entry.Dimension_1 || "Unassigned";
      const type = accountTypeMap[entry.Account_Code];

      if (!deptMap[dept]) {
        deptMap[dept] = { department: dept, revenue: 0, expenses: 0, netIncome: 0 };
      }

      if (type === AccountType.Revenue) {
        deptMap[dept].revenue = roundMoney(deptMap[dept].revenue + Number(entry.Credit) - Number(entry.Debit));
      } else if (type === AccountType.Expense) {
        deptMap[dept].expenses = roundMoney(deptMap[dept].expenses + Number(entry.Debit) - Number(entry.Credit));
      }

      deptMap[dept].netIncome = roundMoney(deptMap[dept].revenue - deptMap[dept].expenses);
    }

    const departments = Object.values(deptMap).sort((a, b) => b.netIncome - a.netIncome);
    return ok({ period: { from, to }, departments });
  } catch (err) {
    console.error(err);
    return error("Failed to generate department comparison report");
  }
}
