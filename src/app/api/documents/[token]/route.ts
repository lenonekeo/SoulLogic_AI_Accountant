import { NextRequest } from "next/server";
import { getTenant } from "@/lib/tenant/context";
import {
  accountNoFromPathname,
  decodeLocator,
  fetchDocument,
} from "@/lib/storage/documents";

export const runtime = "nodejs";
// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

/**
 * Serve a stored invoice document to the tenant it belongs to.
 *
 * Documents are reached through here rather than by their object-store or Drive
 * URL directly: those URLs are unguessable but permanent and unauthenticated,
 * so recording one in the ledger would let anyone who ever saw the link read
 * that invoice forever.
 */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const locator = decodeLocator(params.token);
  if (!locator) return new Response("Not found", { status: 404 });

  // Middleware already requires a session; this establishes *which* tenant.
  let accountNo: string;
  try {
    accountNo = (await getTenant()).accountNo;
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  // Object-store keys are tenant-prefixed, so ownership is checked on the path
  // rather than trusted. Drive-hosted documents predate the prefix and carry no
  // tenant in their id; access to those still rests on Drive's own permissions.
  if (locator.kind === "blob") {
    const owner = accountNoFromPathname(locator.pathname);
    if (!owner || owner !== accountNo) {
      console.warn(`[documents] ${accountNo} attempted to read ${locator.pathname}`);
      return new Response("Not found", { status: 404 });
    }
  }

  try {
    const { buffer, mimeType } = await fetchDocument(locator);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": "inline",
        // Per-user content behind auth — never store it in a shared cache.
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("[documents] fetch failed:", err);
    return new Response("Not found", { status: 404 });
  }
}
