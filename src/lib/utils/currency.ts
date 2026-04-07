const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY ?? "CAD";
const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE ?? "en";

export function formatCurrency(amount: number, currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function parseAmount(value: string | number): number {
  if (typeof value === "number") return roundMoney(value);
  const cleaned = value.replace(/[$,\s]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : roundMoney(parsed);
}

export function sumAmounts(amounts: number[]): number {
  return roundMoney(amounts.reduce((acc, n) => acc + n, 0));
}
