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
    const asOf = searchParams.get("as_of") ?? new Date().toISOString().split("T")[0];

    let entries = await readSheetAsObjects<GLEntry>(SHEETS.GeneralLedger);
    entries = entries.filter((e) => e.Date <= asOf);

    const coa = await readSheetAsObjects<{ Account_Code: string; Account_Name: string; Account_Type: string }>(SHEETS.ChartOfAccounts);
    const accountTypeMap: Record<string, string> = {};
    const accountNameMap: Record<string, string> = {};
    for (const a of coa) {
      accountTypeMap[a.Account_Code] = a.Account_Type;
      accountNameMap[a.Account_Code] = a.Account_Name;
    }

    type AccountBalance = { account: string; name: string; balance: number };
    const assetMap: Record<string, AccountBalance> = {};
    const liabilityMap: Record<string, AccountBalance> = {};
    const equityMap: Record<string, AccountBalance> = {};

    for (const entry of entries) {
      const type = accountTypeMap[entry.Account_Code];
      const net = roundMoney(Number(entry.Debit) - Number(entry.Credit));

      const target =
        type === AccountType.Asset ? assetMap :
        type === AccountType.Liability ? liabilityMap :
        type === AccountType.Equity ? equityMap : null;

      if (!target) continue;

      if (!target[entry.Account_Code]) {
        target[entry.Account_Code] = {
          account: entry.Account_Code,
          name: accountNameMap[entry.Account_Code] ?? entry.Account_Name,
          balance: 0,
        };
      }
      // Assets: debit balance is positive; Liabilities/Equity: credit balance is positive
      if (type === AccountType.Asset) {
        target[entry.Account_Code].balance = roundMoney(target[entry.Account_Code].balance + net);
      } else {
        target[entry.Account_Code].balance = roundMoney(target[entry.Account_Code].balance - net);
      }
    }

    const assets = Object.values(assetMap).sort((a, b) => a.account.localeCompare(b.account));
    const liabilities = Object.values(liabilityMap).sort((a, b) => a.account.localeCompare(b.account));
    const equity = Object.values(equityMap).sort((a, b) => a.account.localeCompare(b.account));

    const totalAssets = roundMoney(assets.reduce((s, a) => s + a.balance, 0));
    const totalLiabilities = roundMoney(liabilities.reduce((s, l) => s + l.balance, 0));
    const totalEquity = roundMoney(equity.reduce((s, e) => s + e.balance, 0));

    return ok({ asOf, assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity });
  } catch (err) {
    console.error(err);
    return error("Failed to generate balance sheet");
  }
}
