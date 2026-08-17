import { google } from "googleapis";
import { randomBytes } from "crypto";
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

export const ACCOUNTS_SHEET = SHEET;

// New fields are appended, never inserted: the registry's existing rows are
// read positionally, so inserting would shift every later column.
export const HEADERS = [
  "Account_No",
  "Email",
  "Spreadsheet_ID",
  "Stripe_Customer_ID",
  "Stripe_Subscription_ID",
  "Plan",
  "Status",
  "Created_Date",
  "Alias",
  "Stripe_Session_ID",
  "Provisioned_Date",
];

/** A row exists from payment onward; the book arrives later, at first sign-in. */
export type AccountStatus = "pending" | "active" | "suspended" | "cancelled";

export interface Account {
  Account_No: string;
  Email: string;
  Spreadsheet_ID: string;
  Stripe_Customer_ID: string;
  Stripe_Subscription_ID: string;
  Plan: string;
  Status: string;
  Created_Date: string;
  Alias: string;
  Stripe_Session_ID: string;
  Provisioned_Date: string;
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getGoogleAuth() });
}

const RANGE = `${SHEET}!A2:${String.fromCharCode(65 + HEADERS.length - 1)}`;

function toAccount(row: string[]): Account {
  const obj: Record<string, string> = {};
  HEADERS.forEach((h, i) => { obj[h] = row[i] ?? ""; });
  if (obj.Spreadsheet_ID) obj.Spreadsheet_ID = normalizeSpreadsheetId(obj.Spreadsheet_ID);
  return obj as unknown as Account;
}

async function readRows(): Promise<string[][]> {
  const response = await getSheetsClient().spreadsheets.values.get({
    spreadsheetId: masterSpreadsheetId(),
    range: RANGE,
  });
  return (response.data.values ?? []) as string[][];
}

// ── Look up an account by email ──
export async function getAccountByEmail(email: string): Promise<Account | null> {
  const row = (await readRows()).find((r) => r[1]?.toLowerCase() === email.toLowerCase());
  return row ? toAccount(row) : null;
}

// ── Look up an account by its inbound email alias ──
export async function getAccountByAlias(alias: string): Promise<Account | null> {
  const wanted = alias.trim().toLowerCase();
  const row = (await readRows()).find((r) => (r[8] ?? "").toLowerCase() === wanted);
  return row ? toAccount(row) : null;
}

// ── Look up by the Stripe checkout session, for webhook idempotency ──
export async function getAccountByStripeSession(sessionId: string): Promise<Account | null> {
  if (!sessionId) return null;
  const row = (await readRows()).find((r) => (r[9] ?? "") === sessionId);
  return row ? toAccount(row) : null;
}

// ── List every account, optionally only the active ones ──
export async function listAccounts(activeOnly = true): Promise<Account[]> {
  return (await readRows())
    .filter((r) => r[0])
    .map(toAccount)
    .filter((a) => !activeOnly || a.Status === "active");
}

/**
 * Next account number in the ACC-NNN sequence.
 *
 * One scheme, and sequential: the Stripe webhook previously minted a random
 * six-digit SL-YYYY-NNNNNN, which both collided (a coin-flip chance of a
 * duplicate by ~1,000 accounts, with nothing checking) and disagreed with the
 * ACC-NNN numbers created by hand.
 */
export async function nextAccountNo(): Promise<string> {
  const highest = (await readRows())
    .map((r) => Number(/^ACC-(\d+)$/.exec(r[0] ?? "")?.[1] ?? 0))
    .reduce((max, n) => Math.max(max, n), 0);
  return `ACC-${String(highest + 1).padStart(3, "0")}`;
}

/**
 * A per-account inbound address.
 *
 * The local part is random rather than derived from the account number:
 * a guessable alias would let anyone inject invoices into a stranger's books.
 */
export function generateAlias(): string | null {
  // Null until the inbound domain exists, rather than throwing: an account is
  // perfectly usable without an alias, and a missing domain should not fail a
  // signup that has already been paid for.
  const domain = process.env.INBOUND_EMAIL_DOMAIN;
  if (!domain) return null;
  return `inv-${randomBytes(5).toString("hex")}@${domain}`;
}

// ── Create a new account row in master sheet ──
export async function createAccount(
  accountNo: string,
  email: string,
  spreadsheetId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  plan: string,
  extra?: { status?: AccountStatus; alias?: string; stripeSessionId?: string }
): Promise<void> {
  const row = [
    accountNo,
    email,
    spreadsheetId,
    stripeCustomerId,
    stripeSubscriptionId,
    plan,
    extra?.status ?? (spreadsheetId ? "active" : "pending"),
    today(),
    extra?.alias ?? "",
    extra?.stripeSessionId ?? "",
    spreadsheetId ? today() : "",
  ];
  await getSheetsClient().spreadsheets.values.append({
    spreadsheetId: masterSpreadsheetId(),
    range: `${SHEET}!A:${String.fromCharCode(65 + HEADERS.length - 1)}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

/** Patch named fields on an account, found by Account_No. */
export async function updateAccount(
  accountNo: string,
  patch: Partial<Record<keyof Account, string>>
): Promise<boolean> {
  const rows = await readRows();
  const index = rows.findIndex((r) => r[0] === accountNo);
  if (index === -1) return false;

  const row = HEADERS.map((_, i) => rows[index][i] ?? "");
  for (const [field, value] of Object.entries(patch)) {
    const col = HEADERS.indexOf(field);
    if (col === -1) throw new Error(`Unknown account field: ${field}`);
    row[col] = value ?? "";
  }

  // +2: the range starts at row 2, and sheet rows are 1-based.
  await getSheetsClient().spreadsheets.values.update({
    spreadsheetId: masterSpreadsheetId(),
    range: `${SHEET}!A${index + 2}:${String.fromCharCode(65 + HEADERS.length - 1)}${index + 2}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
  return true;
}
