import { google } from "googleapis";
import { getGoogleAuth } from "./auth";
import { today } from "@/lib/utils/date";

const MASTER_SPREADSHEET_ID = process.env.MASTER_SPREADSHEET_ID!;
const SHEET = "Accounts";

const HEADERS = [
  "Account_No",
  "Email",
  "Spreadsheet_ID",
  "Stripe_Customer_ID",
  "Stripe_Subscription_ID",
  "Plan",
  "Status",
  "Created_Date",
];

export interface Account {
  Account_No: string;
  Email: string;
  Spreadsheet_ID: string;
  Stripe_Customer_ID: string;
  Stripe_Subscription_ID: string;
  Plan: string;
  Status: string;
  Created_Date: string;
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getGoogleAuth() });
}

// ── Look up an account by email ──
export async function getAccountByEmail(email: string): Promise<Account | null> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: MASTER_SPREADSHEET_ID,
    range: `${SHEET}!A2:H`,
  });
  const rows = response.data.values ?? [];
  const row = rows.find((r) => r[1]?.toLowerCase() === email.toLowerCase());
  if (!row) return null;
  const obj: Record<string, string> = {};
  HEADERS.forEach((h, i) => { obj[h] = row[i] ?? ""; });
  return obj as unknown as Account;
}

// ── Create a new account row in master sheet ──
export async function createAccount(
  accountNo: string,
  email: string,
  spreadsheetId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  plan: string
): Promise<void> {
  const sheets = getSheetsClient();
  const row = [
    accountNo,
    email,
    spreadsheetId,
    stripeCustomerId,
    stripeSubscriptionId,
    plan,
    "active",
    today(),
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: MASTER_SPREADSHEET_ID,
    range: `${SHEET}!A:H`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}
