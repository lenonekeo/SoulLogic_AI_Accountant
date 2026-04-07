import { Province } from "@/types/enums";
import { roundMoney } from "@/lib/utils/currency";

export interface PayrollDeductions {
  grossPay: number;
  federalTax: number;
  provincialTax: number;
  cppQppEmployee: number;
  cppQppEmployer: number;
  eiEmployee: number;
  eiEmployer: number;
  qpipEmployee: number;
  qpipEmployer: number;
  totalDeductions: number;
  netPay: number;
}

// ── 2026 Canadian Payroll Rates (simplified — use CRA tables for production) ──
const CPP_RATE = 0.0595; // 5.95%
const CPP_MAX_EARNINGS = 73200;
const CPP_BASIC_EXEMPTION = 3500;

const QPP_RATE = 0.064; // 6.4% (Quebec)
const QPP_MAX_EARNINGS = 73200;

const EI_RATE_EMPLOYEE = 0.0166; // 1.66%
const EI_RATE_EMPLOYER = 0.0233; // 2.33% (1.4x employee)
const EI_MAX_INSURABLE = 63200;

const QPIP_RATE_EMPLOYEE = 0.00494; // Quebec Parental Insurance Plan
const QPIP_RATE_EMPLOYER = 0.00692;
const QPIP_MAX_INSURABLE = 98000;

// ── Simplified marginal tax brackets (Federal 2026) ──
function federalTax(annualized: number): number {
  let tax = 0;
  if (annualized <= 55867) tax = annualized * 0.15;
  else if (annualized <= 111733) tax = 8380 + (annualized - 55867) * 0.205;
  else if (annualized <= 154906) tax = 19801 + (annualized - 111733) * 0.26;
  else if (annualized <= 220000) tax = 31023 + (annualized - 154906) * 0.29;
  else tax = 49925 + (annualized - 220000) * 0.33;

  // Basic personal amount credit (approx)
  const bpa = 15705 * 0.15;
  return Math.max(0, tax - bpa);
}

// ── Simplified provincial tax (Quebec) ──
function quebecTax(annualized: number): number {
  let tax = 0;
  if (annualized <= 51780) tax = annualized * 0.14;
  else if (annualized <= 103545) tax = 7249 + (annualized - 51780) * 0.19;
  else if (annualized <= 126000) tax = 17087 + (annualized - 103545) * 0.24;
  else tax = 22480 + (annualized - 126000) * 0.2575;

  const bpa = 17183 * 0.14;
  return Math.max(0, tax - bpa);
}

// ── Simplified provincial tax (Ontario) ──
function ontarioTax(annualized: number): number {
  let tax = 0;
  if (annualized <= 51446) tax = annualized * 0.0505;
  else if (annualized <= 102894) tax = 2598 + (annualized - 51446) * 0.0915;
  else if (annualized <= 150000) tax = 7307 + (annualized - 102894) * 0.1116;
  else tax = 12564 + (annualized - 150000) * 0.1216;
  return Math.max(0, tax);
}

// ── Calculate payroll deductions for a pay period ──
export function calculatePayroll(
  hoursWorked: number,
  hourlyRate: number,
  province: Province = Province.QC,
  payPeriodsPerYear = 26 // Bi-weekly default
): PayrollDeductions {
  const grossPay = roundMoney(hoursWorked * hourlyRate);
  const annualized = grossPay * payPeriodsPerYear;

  // CPP / QPP
  const isQuebec = province === Province.QC;
  const pensionRate = isQuebec ? QPP_RATE : CPP_RATE;
  const pensionMaxEarnings = isQuebec ? QPP_MAX_EARNINGS : CPP_MAX_EARNINGS;
  const pensionableEarnings = Math.max(0, Math.min(annualized, pensionMaxEarnings) - CPP_BASIC_EXEMPTION);
  const annualPension = pensionableEarnings * pensionRate;
  const cppQppEmployee = roundMoney(annualPension / payPeriodsPerYear);
  const cppQppEmployer = cppQppEmployee; // employer matches employee

  // EI
  const eiInsurableEarnings = Math.min(annualized, EI_MAX_INSURABLE);
  const annualEiEmployee = eiInsurableEarnings * EI_RATE_EMPLOYEE;
  const eiEmployee = roundMoney(annualEiEmployee / payPeriodsPerYear);
  const eiEmployer = roundMoney(eiEmployee * 1.4);

  // QPIP (Quebec only)
  let qpipEmployee = 0;
  let qpipEmployer = 0;
  if (isQuebec) {
    const qpipInsurable = Math.min(annualized, QPIP_MAX_INSURABLE);
    qpipEmployee = roundMoney((qpipInsurable * QPIP_RATE_EMPLOYEE) / payPeriodsPerYear);
    qpipEmployer = roundMoney((qpipInsurable * QPIP_RATE_EMPLOYER) / payPeriodsPerYear);
  }

  // Income tax
  const annualFedTax = federalTax(annualized);
  const annualProvTax = isQuebec ? quebecTax(annualized) : ontarioTax(annualized);
  const federalTaxPeriod = roundMoney(annualFedTax / payPeriodsPerYear);
  const provincialTaxPeriod = roundMoney(annualProvTax / payPeriodsPerYear);

  const totalDeductions = roundMoney(
    federalTaxPeriod + provincialTaxPeriod + cppQppEmployee + eiEmployee + qpipEmployee
  );
  const netPay = roundMoney(grossPay - totalDeductions);

  return {
    grossPay,
    federalTax: federalTaxPeriod,
    provincialTax: provincialTaxPeriod,
    cppQppEmployee,
    cppQppEmployer,
    eiEmployee,
    eiEmployer,
    qpipEmployee,
    qpipEmployer,
    totalDeductions,
    netPay,
  };
}
