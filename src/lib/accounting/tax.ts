import { Province } from "@/types/enums";
import { roundMoney } from "@/lib/utils/currency";

export interface TaxBreakdown {
  subtotal: number;
  gst: number;
  qst: number;
  hst: number;
  pst: number;
  totalTax: number;
  total: number;
}

// ── Province-specific tax rates ──
const TAX_RULES: Record<string, { gst?: number; hst?: number; qst?: number; pst?: number }> = {
  [Province.QC]: { gst: 0.05, qst: 0.09975 },
  [Province.ON]: { hst: 0.13 },
  [Province.NB]: { hst: 0.15 },
  [Province.NS]: { hst: 0.15 },
  [Province.NL]: { hst: 0.15 },
  [Province.PE]: { hst: 0.15 },
  [Province.BC]: { gst: 0.05, pst: 0.07 },
  [Province.MB]: { gst: 0.05, pst: 0.07 },
  [Province.SK]: { gst: 0.05, pst: 0.06 },
  [Province.AB]: { gst: 0.05 },
  [Province.NT]: { gst: 0.05 },
  [Province.NU]: { gst: 0.05 },
  [Province.YT]: { gst: 0.05 },
};

// ── Default province from environment ──
function defaultProvince(): string {
  return process.env.DEFAULT_PROVINCE ?? Province.QC;
}

// ── Calculate tax breakdown for a subtotal ──
export function calculateTax(subtotal: number, province?: string): TaxBreakdown {
  const prov = (province ?? defaultProvince()) as Province;
  const rules = TAX_RULES[prov] ?? TAX_RULES[Province.QC];

  let gst = 0;
  let qst = 0;
  let hst = 0;
  let pst = 0;

  if (rules.hst) {
    hst = roundMoney(subtotal * rules.hst);
  } else {
    if (rules.gst) gst = roundMoney(subtotal * rules.gst);
    // NOTE: QST does NOT compound on GST — applies to subtotal only
    if (rules.qst) qst = roundMoney(subtotal * rules.qst);
    if (rules.pst) pst = roundMoney(subtotal * rules.pst);
  }

  const totalTax = roundMoney(gst + qst + hst + pst);
  const total = roundMoney(subtotal + totalTax);

  return { subtotal, gst, qst, hst, pst, totalTax, total };
}

// ── Get combined tax rate for a province ──
export function getCombinedTaxRate(province?: string): number {
  const prov = (province ?? defaultProvince()) as Province;
  const rules = TAX_RULES[prov] ?? TAX_RULES[Province.QC];

  if (rules.hst) return rules.hst;
  return (rules.gst ?? 0) + (rules.qst ?? 0) + (rules.pst ?? 0);
}

// ── GL account codes for tax ──
export function getTaxGLAccounts(province?: string): Array<{ code: string; name: string; amount: number }> {
  const prov = (province ?? defaultProvince()) as Province;
  const rules = TAX_RULES[prov] ?? TAX_RULES[Province.QC];
  const accounts = [];

  if (rules.hst) {
    accounts.push({ code: "2100", name: "GST/HST Payable", amount: 0 });
  } else {
    if (rules.gst) accounts.push({ code: "2100", name: "GST/HST Payable", amount: 0 });
    if (rules.qst) accounts.push({ code: "2110", name: "QST Payable", amount: 0 });
    if (rules.pst) accounts.push({ code: "2120", name: "PST Payable", amount: 0 });
  }

  return accounts;
}
