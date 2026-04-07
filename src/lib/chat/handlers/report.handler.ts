import { IntentResult } from "@/types/api";
import { ChatIntent } from "@/types/enums";
import { ChatContext, HandlerResult } from "../router";
import { formatCurrency } from "@/lib/utils/currency";

const BASE_URL = process.env.APP_URL ?? "http://localhost:3000";

async function fetchReport(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api${path}`);
  if (!res.ok) throw new Error(`Report fetch failed: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function handleReport(intent: IntentResult, ctx: ChatContext): Promise<HandlerResult> {
  const en = ctx.language !== "fr";
  const dateRange = intent.entities.date_range;
  const from = dateRange?.from ?? new Date().getFullYear() + "-01-01";
  const to = dateRange?.to ?? new Date().toISOString().split("T")[0];

  try {
    if (intent.intent === ChatIntent.ShowPnL) {
      const data = await fetchReport(`/reports/pnl?from=${from}&to=${to}`) as {
        totalRevenue: number; totalExpenses: number; netIncome: number;
      };
      return {
        message: en
          ? `📊 P&L Summary (${from} → ${to})\n💰 Revenue: ${formatCurrency(data.totalRevenue)}\n💸 Expenses: ${formatCurrency(data.totalExpenses)}\n📈 Net Income: ${formatCurrency(data.netIncome)}`
          : `📊 Résumé P&L (${from} → ${to})\n💰 Revenus: ${formatCurrency(data.totalRevenue)}\n💸 Dépenses: ${formatCurrency(data.totalExpenses)}\n📈 Revenu net: ${formatCurrency(data.netIncome)}`,
        data,
      };
    }

    if (intent.intent === ChatIntent.ShowBalanceSheet) {
      const data = await fetchReport(`/reports/balance-sheet?as_of=${to}`) as {
        totalAssets: number; totalLiabilities: number; totalEquity: number;
      };
      return {
        message: en
          ? `📊 Balance Sheet (as of ${to})\n🏦 Assets: ${formatCurrency(data.totalAssets)}\n📋 Liabilities: ${formatCurrency(data.totalLiabilities)}\n💼 Equity: ${formatCurrency(data.totalEquity)}`
          : `📊 Bilan (au ${to})\n🏦 Actifs: ${formatCurrency(data.totalAssets)}\n📋 Passifs: ${formatCurrency(data.totalLiabilities)}\n💼 Capitaux: ${formatCurrency(data.totalEquity)}`,
        data,
      };
    }

    if (intent.intent === ChatIntent.ShowAging) {
      const data = await fetchReport(`/reports/aging?type=ar&as_of=${to}`) as {
        totals: { total: number; over90: number };
      };
      return {
        message: en
          ? `📊 AR Aging (as of ${to})\nTotal Outstanding: ${formatCurrency(data.totals.total)}\nOver 90 days: ${formatCurrency(data.totals.over90)}`
          : `📊 Vieillissement AR (au ${to})\nTotal en attente: ${formatCurrency(data.totals.total)}\nPlus de 90 jours: ${formatCurrency(data.totals.over90)}`,
        data,
      };
    }

    return {
      message: en
        ? `Report available at ${BASE_URL}/reports`
        : `Rapport disponible à ${BASE_URL}/reports`,
    };
  } catch {
    return { message: en ? "Could not generate report. Please try again." : "Impossible de générer le rapport. Veuillez réessayer." };
  }
}
