import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { SHEETS, SHEET_HEADERS } from "@/types/sheets";

export interface ProvisionResult {
  spreadsheetId: string;
  url: string;
  tabs: number;
}

/**
 * Build a new, empty book of account for a tenant.
 *
 * Created with the customer's own OAuth client, so the file lives in their
 * Drive and they own it — the service account cannot own Drive files at all
 * (it has no storage quota, and `files.copy` fails with "storage quota has
 * been exceeded"), which is why provisioning happens at first sign-in rather
 * than at payment.
 *
 * The tabs are built from SHEET_HEADERS rather than copied from a template
 * file. A template has to be owned, shared and kept in step with the schema,
 * and pointing it at a live book — as TEMPLATE_SPREADSHEET_ID did — copies one
 * tenant's records into every new account.
 */
export async function provisionTenantBook(
  userAuth: OAuth2Client,
  opts: { accountNo: string; serviceAccountEmail: string }
): Promise<ProvisionResult> {
  const sheets = google.sheets({ version: "v4", auth: userAuth });
  const drive = google.drive({ version: "v3", auth: userAuth });

  const tabs = Object.values(SHEETS) as string[];

  // Create every tab up front: one request, and no default "Sheet1" left over.
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `SoulLogic Books — ${opts.accountNo}` },
      sheets: tabs.map((title) => ({ properties: { title } })),
    },
    fields: "spreadsheetId",
  });
  const spreadsheetId = created.data.spreadsheetId!;

  // Header rows, batched — 20 separate writes would be 20 round trips.
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: tabs
        .filter((tab) => SHEET_HEADERS[tab]?.length)
        .map((tab) => ({ range: `${tab}!A1`, values: [SHEET_HEADERS[tab]] })),
    },
  });

  // Freeze and bold the header row so the sheet is usable by hand too.
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: (meta.data.sheets ?? []).flatMap((s) => {
        const sheetId = s.properties?.sheetId;
        if (sheetId == null) return [];
        return [
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
              fields: "gridProperties.frozenRowCount",
            },
          },
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: "userEnteredFormat.textFormat.bold",
            },
          },
        ];
      }),
    },
  });

  // The service account does the day-to-day reading and writing, so it needs
  // access. Granting it is allowed here because this file was created by the
  // app under the customer's own credentials.
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: { role: "writer", type: "user", emailAddress: opts.serviceAccountEmail },
    sendNotificationEmail: false,
  });

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    tabs: tabs.length,
  };
}
