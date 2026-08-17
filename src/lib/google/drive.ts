import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import { getGoogleAuth, getGmailAuth } from "./auth";
import { sniffContentType } from "@/lib/utils/content-type";

function getDriveClient(): drive_v3.Drive {
  // Use OAuth user credentials so uploads count against user quota (not service account)
  const auth = process.env.GMAIL_REFRESH_TOKEN ? getGmailAuth() : getGoogleAuth();
  return google.drive({ version: "v3", auth });
}

// Resolved lazily: read at module scope this lands before dotenv has loaded in
// scripts, silently yielding "" and uploading to the wrong Drive location.
function rootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!id) throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID is not set");
  return id;
}

// ── Get or create a folder by name under a parent ──
export async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  const drive = getDriveClient();

  // Search for existing folder
  const response = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: "files(id, name)",
  });

  const existing = response.data.files?.[0];
  if (existing?.id) return existing.id;

  // Create new folder
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  return created.data.id!;
}

// ── Build the folder path and return the leaf folder ID ──
// Path: /SoulLogic_Accounting/{clientId}/{docType}/{year}/
export async function ensureFolderPath(clientId: string, docType: string, year?: string): Promise<string> {
  const yearStr = year ?? new Date().getFullYear().toString();

  const clientFolderId = await getOrCreateFolder(clientId, rootFolderId());
  const docFolderId = await getOrCreateFolder(docType, clientFolderId);
  const yearFolderId = await getOrCreateFolder(yearStr, docFolderId);

  return yearFolderId;
}

// ── Upload a document buffer to Google Drive and return its URL ──
export async function uploadPdf(
  pdfBuffer: Buffer,
  fileName: string,
  folderId: string,
  shareWithEmail?: string
): Promise<{ fileId: string; url: string }> {
  const drive = getDriveClient();

  const stream = Readable.from(pdfBuffer);
  // Read the type from the bytes: phone photos arrive alongside PDFs, and
  // labelling a JPEG application/pdf leaves Drive unable to preview it.
  const { mimeType } = sniffContentType(pdfBuffer);

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id",
  });

  const fileId = created.data.id!;

  // Grant read access to the owner of the book this document belongs to, and
  // to nobody else. These are customer invoices: they must never be readable
  // by anyone holding the link.
  if (shareWithEmail) {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "user",
        emailAddress: shareWithEmail,
      },
      sendNotificationEmail: false,
    });
  }

  const url = `https://drive.google.com/file/d/${fileId}/view`;
  return { fileId, url };
}

// ── Upload a document for a given doc type and entity ──
export async function uploadDocument(
  pdfBuffer: Buffer,
  fileName: string,
  clientId: string,
  docType: string,
  year?: string,
  shareWithEmail?: string
): Promise<string> {
  const folderId = await ensureFolderPath(clientId, docType, year);
  const { url } = await uploadPdf(pdfBuffer, fileName, folderId, shareWithEmail);
  return url;
}

// ── Download a file's bytes by ID ──
export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

/** Pull the file id out of a Drive share/view URL. */
export function fileIdFromUrl(url: string): string | null {
  return url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? null;
}

// ── Delete a file by ID ──
export async function deleteFile(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}
