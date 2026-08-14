import { google } from "googleapis";
import { getGoogleAuth } from "./auth";
import { normalizeSpreadsheetId } from "./spreadsheet-id";
import { today } from "@/lib/utils/date";

const SHEET = "Accounts";

// Resolved lazily: this module sits on the import path of nearly every route,
// so reading it at module scope would turn a missing env var into an opaque
// crash at import time rather than a clear error at the point of use.
function masterSpreadsheetId(): string {
  const raw = process.env.MASTER_SPREADSHEET_ID;
  if (!raw) throw new Error("MASTER_SPREADSHEET_ID is not set");
  return normalizeSpreadsheetId(raw);
}

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
    spreadsheetId: masterSpreadsheetId(),
    range: `${SHEET}!A2:H`,
  });
  const rows = response.data.values ?? [];
  const row = rows.find((r) => r[1]?.toLowerCase() === email.toLowerCase());
  if (!row) return null;
  const obj: Record<string, string> = {};
  HEADERS.forEach((h, i) => { obj[h] = row[i] ?? ""; });
  if (obj.Spreadsheet_ID) {
    obj.Spreadsheet_ID = normalizeSpreadsheetId(obj.Spreadsheet_ID);
  }
  return obj as unknown as Account;
}

// ── List every account, optionally only the active ones ──
export async function listAccounts(activeOnly = true): Promise<Account[]> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: masterSpreadsheetId(),
    range: `${SHEET}!A2:H`,
  });
  const rows = response.data.values ?? [];
  return rows
    .filter((r) => r[0] && r[2]) // needs an Account_No and a Spreadsheet_ID
    .map((row) => {
      const obj: Record<string, string> = {};
      HEADERS.forEach((h, i) => { obj[h] = row[i] ?? ""; });
      obj.Spreadsheet_ID = normalizeSpreadsheetId(obj.Spreadsheet_ID);
      return obj as unknown as Account;
    })
    .filter((a) => !activeOnly || a.Status === "active");
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
    spreadsheetId: masterSpreadsheetId(),
    range: `${SHEET}!A:H`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}
