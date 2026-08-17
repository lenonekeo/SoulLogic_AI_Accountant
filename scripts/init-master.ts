// Provision the master Accounts registry.
//
// Run: npm run init:master [--force]
//
// The service account cannot read a spreadsheet created by hand — it would have
// to be shared with it manually, which is the step everyone forgets. Instead
// the app creates the sheet under the signed-in user's own Drive (drive.file
// covers files the app creates) and grants the service account access itself.
// The user still owns the file; no extra OAuth scope is involved.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true } as never);

import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { google } from "googleapis";
import { getGmailAuth, getGoogleAuth } from "../src/lib/google/auth";
import { HEADERS, ACCOUNTS_SHEET } from "../src/lib/google/accounts";
import { normalizeSpreadsheetId } from "../src/lib/google/spreadsheet-id";

const ENV_PATH = ".env.local";

/** Can the service account already read the configured master sheet? */
async function currentMasterWorks(): Promise<boolean> {
  const raw = process.env.MASTER_SPREADSHEET_ID;
  if (!raw) return false;
  try {
    await google.sheets({ version: "v4", auth: getGoogleAuth() }).spreadsheets.get({
      spreadsheetId: normalizeSpreadsheetId(raw),
      fields: "properties.title",
    });
    return true;
  } catch {
    return false;
  }
}

function writeEnvVar(key: string, value: string) {
  copyFileSync(ENV_PATH, `${ENV_PATH}.bak`);
  const content = readFileSync(ENV_PATH, "utf8");
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const next = pattern.test(content)
    ? content.replace(pattern, line)
    : `${content.replace(/\n*$/, "")}\n${line}\n`;
  writeFileSync(ENV_PATH, next, "utf8");
  console.log(`   ${ENV_PATH} updated (previous saved as ${ENV_PATH}.bak)`);
}

async function main() {
  const force = process.argv.includes("--force");
  const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!serviceAccount) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is not set");

  if (!force && (await currentMasterWorks())) {
    console.log("\nMASTER_SPREADSHEET_ID is already readable by the service account — nothing to do.");
    console.log("Pass --force to provision a new registry anyway.\n");
    return;
  }

  const userAuth = getGmailAuth();
  const sheets = google.sheets({ version: "v4", auth: userAuth });
  const drive = google.drive({ version: "v3", auth: userAuth });

  console.log("\n1. creating the registry in your Drive");
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "SoulLogic — Accounts (master)" },
      sheets: [{ properties: { title: ACCOUNTS_SHEET } }],
    },
    fields: "spreadsheetId",
  });
  const spreadsheetId = created.data.spreadsheetId!;
  console.log(`   ${spreadsheetId}`);

  console.log("2. writing the Accounts header row");
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${ACCOUNTS_SHEET}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS] },
  });

  console.log(`3. granting the service account write access`);
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: { role: "writer", type: "user", emailAddress: serviceAccount },
    sendNotificationEmail: false,
  });
  console.log(`   ${serviceAccount}`);

  console.log("4. verifying the service account can read it");
  const check = await google.sheets({ version: "v4", auth: getGoogleAuth() }).spreadsheets.get({
    spreadsheetId,
    fields: "properties.title,sheets.properties.title",
  });
  const tabs = check.data.sheets?.map((s) => s.properties?.title).join(", ");
  console.log(`   "${check.data.properties?.title}" — tabs: ${tabs}`);

  console.log("5. updating configuration");
  writeEnvVar("MASTER_SPREADSHEET_ID", spreadsheetId);

  console.log(`\nRegistry ready: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  console.log("Add tenants with:  npm run add:account -- <email> <their-spreadsheet-id>\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
