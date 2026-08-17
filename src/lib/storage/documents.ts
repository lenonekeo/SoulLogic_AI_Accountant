import { put, get } from "@vercel/blob";
import { downloadFile, fileIdFromUrl, getOrCreateFolder, uploadPdf } from "@/lib/google/drive";
import { sniffContentType } from "@/lib/utils/content-type";

/**
 * Where a stored document lives.
 *
 * Two schemes because Drive-hosted documents predate object storage and their
 * links are already recorded in the ledger; both have to stay readable.
 */
export type Locator = { kind: "blob"; pathname: string } | { kind: "drive"; fileId: string };

export interface StoredDocument {
  /** Goes in the ledger. Points at this app, not at the object store. */
  url: string;
  locator: Locator;
}

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function appUrl(): string {
  // Trimmed first: APP_URL was stored with a trailing newline, which produced
  // document links with a line break inside the host and resolved nowhere.
  return (process.env.APP_URL ?? "http://localhost:3000").trim().replace(/\/$/, "");
}

export function encodeLocator(locator: Locator): string {
  const raw = locator.kind === "blob" ? `blob:${locator.pathname}` : `drive:${locator.fileId}`;
  return Buffer.from(raw, "utf8").toString("base64url");
}

export function decodeLocator(token: string): Locator | null {
  let raw: string;
  try {
    raw = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (raw.startsWith("blob:")) return { kind: "blob", pathname: raw.slice(5) };
  if (raw.startsWith("drive:")) return { kind: "drive", fileId: raw.slice(6) };
  return null;
}

/**
 * Read a locator back out of a stored PDF_URL.
 *
 * Handles both the proxied form written now and the bare Drive links written
 * before object storage existed.
 */
export function locatorFromStoredUrl(storedUrl: string): Locator | null {
  if (!storedUrl) return null;
  const proxied = storedUrl.match(/\/api\/documents\/([A-Za-z0-9_-]+)/);
  if (proxied) return decodeLocator(proxied[1]);
  const driveId = fileIdFromUrl(storedUrl);
  return driveId ? { kind: "drive", fileId: driveId } : null;
}

/** The tenant a blob path belongs to, for authorising a read. */
export function accountNoFromPathname(pathname: string): string | null {
  return pathname.match(/^tenants\/([^/]+)\//)?.[1] ?? null;
}

export interface StoreOptions {
  accountNo: string;
  category: string;
  year: string;
  filename: string;
  buffer: Buffer;
  /** Only used by the Drive fallback, which shares each file with its owner. */
  ownerEmail?: string;
}

/**
 * Store a document for one tenant.
 *
 * The key is prefixed per tenant so isolation is a property of the path rather
 * than of remembering to filter, and the returned url points at this app's
 * authenticated proxy — object-store URLs are unguessable but permanent, and
 * putting one in the ledger would make every invoice readable by anyone who
 * ever saw the link.
 */
export async function storeDocument(opts: StoreOptions): Promise<StoredDocument> {
  const { accountNo, category, year, filename, buffer } = opts;

  if (blobConfigured()) {
    const { mimeType } = sniffContentType(buffer);
    const pathname = `tenants/${accountNo}/${category}/${year}/${filename}`;
    // Private: the store rejects public access outright, and a private blob's
    // own URL answers 403 without credentials. Reads go through this app's
    // proxy, which checks the tenant first.
    const result = await put(pathname, buffer, {
      access: "private",
      addRandomSuffix: true,
      contentType: mimeType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    } as Parameters<typeof put>[2]);
    const locator: Locator = { kind: "blob", pathname: result.pathname };
    return { url: `${appUrl()}/api/documents/${encodeLocator(locator)}`, locator };
  }

  // Fallback while no object store is configured: keep using Drive so nothing
  // stops working, but return the same proxied shape.
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) throw new Error("Neither BLOB_READ_WRITE_TOKEN nor GOOGLE_DRIVE_ROOT_FOLDER_ID is set");
  const categoryFolder = await getOrCreateFolder(category, rootFolderId);
  const yearFolder = await getOrCreateFolder(year, categoryFolder);
  const { fileId } = await uploadPdf(buffer, filename, yearFolder, opts.ownerEmail);
  const locator: Locator = { kind: "drive", fileId };
  return { url: `${appUrl()}/api/documents/${encodeLocator(locator)}`, locator };
}

/** Fetch a stored document's bytes. */
export async function fetchDocument(locator: Locator): Promise<{ buffer: Buffer; mimeType: string }> {
  if (locator.kind === "drive") {
    const buffer = await downloadFile(locator.fileId);
    return { buffer, mimeType: sniffContentType(buffer).mimeType };
  }

  // Read through the SDK with the store token. A private blob's own URL
  // answers 403, so it cannot simply be fetched.
  const result = (await get(locator.pathname, {
    token: process.env.BLOB_READ_WRITE_TOKEN,
    access: "private",
  } as Parameters<typeof get>[1])) as unknown as {
    statusCode: number;
    stream: ReadableStream;
    headers?: Record<string, string>;
  } | null;

  if (!result || result.statusCode >= 400) {
    throw new Error(`Blob read failed: ${result?.statusCode ?? "no response"}`);
  }
  const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
  const declared = result.headers?.["content-type"];
  return { buffer, mimeType: declared ?? sniffContentType(buffer).mimeType };
}
