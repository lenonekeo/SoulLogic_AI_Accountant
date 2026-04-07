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

    let entries = await readSheetAsObjects<GLEntry>(SHEETS.GeneralLedger);
    entries = entries.filter((e) => e.Date >= from && e.Date <= to);

    const coa = await readSheetAsObjects<{ Account_Code: string; Account_Type: string }>(SHEETS.ChartOfAccounts);
    const accountTypeMap: Record<string, string> = {};
    for (const a of coa) accountTypeMap[a.Account_Code] = a.Account_Type;

    type ProjectData = { project: string; revenue: number; expenses: number; netIncome: number };
    const projectMap: Record<string, ProjectData> = {};

    for (const entry of entries) {
      const project = entry.Dimension_2 || "Unassigned";
      const type = accountTypeMap[entry.Account_Code];

      if (!projectMap[project]) {
        projectMap[project] = { project, revenue: 0, expenses: 0, netIncome: 0 };
      }

      if (type === AccountType.Revenue) {
        projectMap[project].revenue = roundMoney(projectMap[project].revenue + Number(entry.Credit) - Number(entry.Debit));
      } else if (type === AccountType.Expense) {
        projectMap[project].expenses = roundMoney(projectMap[project].expenses + Number(entry.Debit) - Number(entry.Credit));
      }

      projectMap[project].netIncome = roundMoney(projectMap[project].revenue - projectMap[project].expenses);
    }

    const projects = Object.values(projectMap).sort((a, b) => b.netIncome - a.netIncome);
    return ok({ period: { from, to }, projects });
  } catch (err) {
    console.error(err);
    return error("Failed to generate project profitability report");
  }
}
