import { formatCurrency } from "@/lib/utils/currency";

export function formatPnLSummary(
  totalRevenue: number,
  totalExpenses: number,
  netIncome: number,
  period: { from: string; to: string },
  language: "en" | "fr" = "en"
): string {
  const en = language !== "fr";
  const trend = netIncome >= 0 ? "📈" : "📉";
  return en
    ? `${trend} P&L (${period.from} → ${period.to})\nRevenue: ${formatCurrency(totalRevenue)}\nExpenses: ${formatCurrency(totalExpenses)}\nNet: ${formatCurrency(netIncome)}`
    : `${trend} P&L (${period.from} → ${period.to})\nRevenus: ${formatCurrency(totalRevenue)}\nDépenses: ${formatCurrency(totalExpenses)}\nNet: ${formatCurrency(netIncome)}`;
}
