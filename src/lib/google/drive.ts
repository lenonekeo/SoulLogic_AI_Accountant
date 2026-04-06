import { google, drive_v3 } from "googleapis";
import { getGoogleAuth } from "./auth";

function getDriveClient(): drive_v3.Drive {
  return google.drive({ version: "v3", auth: getGoogleAuth() });
}

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? "";
console.log("[drive] ROOT_FOLDER_ID:", ROOT_FOLDER_ID ? ROOT_FOLDER_ID.slice(0, 8) + "..." : "EMPTY");

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

  const clientFolderId = await getOrCreateFolder(clientId, ROOT_FOLDER_ID);
  const docFolderId = await getOrCreateFolder(docType, clientFolderId);
  const yearFolderId = await getOrCreateFolder(yearStr, docFolderId);

  return yearFolderId;
}

// ── Upload a PDF buffer to Google Drive and return the public URL ──
export async function uploadPdf(
  pdfBuffer: Buffer,
  fileName: string,
  folderId: string
): Promise<{ fileId: string; url: string }> {
  const drive = getDriveClient();

  const { Readable } = await import("stream");
  const stream = Readable.from(pdfBuffer);

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "application/pdf",
      parents: [folderId],
    },
    media: {
      mimeType: "application/pdf",
      body: stream,
    },
    fields: "id",
  });

  const fileId = created.data.id!;

  // Make file publicly readable
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  const url = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  return { fileId, url };
}

// ── Upload a document for a given doc type and entity ──
export async function uploadDocument(
  pdfBuffer: Buffer,
  fileName: string,
  clientId: string,
  docType: string,
  year?: string
): Promise<string> {
  const folderId = await ensureFolderPath(clientId, docType, year);
  const { url } = await uploadPdf(pdfBuffer, fileName, folderId);
  return url;
}

// ── Delete a file by ID ──
export async function deleteFile(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}
