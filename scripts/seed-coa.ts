// seed-coa.ts — Seed Chart of Accounts with standard Canadian accounts
// Run: npm run seed:coa

import "dotenv/config";
import { appendRow } from "../src/lib/google/sheets";
import { SHEETS } from "../src/types/sheets";
import { runSeed } from "./target";

const COA_SEEDS = [
  // Assets
  ["1000", "Cash", "Asset", "Current Assets", "TRUE"],
  ["1100", "Accounts Receivable", "Asset", "Current Assets", "TRUE"],
  ["1200", "Inventory", "Asset", "Current Assets", "TRUE"],
  ["1500", "Equipment", "Asset", "Fixed Assets", "TRUE"],
  ["1600", "Accumulated Depreciation", "Asset", "Fixed Assets", "TRUE"],
  // Liabilities
  ["2000", "Accounts Payable", "Liability", "Current Liabilities", "TRUE"],
  ["2100", "GST/HST Payable", "Liability", "Tax Liabilities", "TRUE"],
  ["2110", "QST Payable", "Liability", "Tax Liabilities", "TRUE"],
  ["2120", "PST Payable", "Liability", "Tax Liabilities", "TRUE"],
  ["2200", "Payroll Liabilities", "Liability", "Current Liabilities", "TRUE"],
  ["2300", "Credit Card Payable", "Liability", "Current Liabilities", "TRUE"],
  ["2900", "Long-Term Debt", "Liability", "Long-Term Liabilities", "TRUE"],
  // Equity
  ["3000", "Owner Equity", "Equity", "Equity", "TRUE"],
  ["3100", "Retained Earnings", "Equity", "Equity", "TRUE"],
  // Revenue
  ["4000", "Sales Revenue", "Revenue", "Operating Revenue", "TRUE"],
  ["4010", "Service Revenue", "Revenue", "Operating Revenue", "TRUE"],
  ["4100", "Other Revenue", "Revenue", "Other Revenue", "TRUE"],
  // Expenses
  ["5000", "Cost of Goods Sold", "Expense", "COGS", "TRUE"],
  ["5100", "Salaries & Wages", "Expense", "Payroll", "TRUE"],
  ["5200", "Rent", "Expense", "Operating Expenses", "TRUE"],
  ["5300", "Utilities", "Expense", "Operating Expenses", "TRUE"],
  ["5400", "Office Supplies", "Expense", "Operating Expenses", "TRUE"],
  ["5500", "Marketing & Advertising", "Expense", "Operating Expenses", "TRUE"],
  ["5600", "Professional Fees", "Expense", "Operating Expenses", "TRUE"],
  ["5700", "Travel & Entertainment", "Expense", "Operating Expenses", "TRUE"],
  ["5800", "Depreciation", "Expense", "Operating Expenses", "TRUE"],
  ["5900", "Bank Charges", "Expense", "Operating Expenses", "TRUE"],
  ["6000", "Other Expenses", "Expense", "Other Expenses", "TRUE"],
];

async function seedCoA() {
  console.log(`Seeding ${COA_SEEDS.length} Chart of Accounts entries...`);

  for (const row of COA_SEEDS) {
    // Pad with 8 empty dimension columns
    const fullRow = [...row, "", "", "", "", "", "", "", ""];
    try {
      await appendRow(SHEETS.ChartOfAccounts, fullRow);
      console.log(`✓ ${row[0]} — ${row[1]}`);
    } catch (err) {
      console.error(`✗ ${row[0]}:`, err);
    }
  }

  console.log("\nChart of Accounts seeded.");
}

runSeed(seedCoA).catch(console.error);
