import { AsyncLocalStorage } from "async_hooks";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export interface TenantContext {
  accountNo: string;
  spreadsheetId: string;
  /** Owner of this book — uploaded documents are shared with them. */
  email?: string;
}

/**
 * Explicit tenant context, for code paths that have no user session:
 * cron jobs, inbound-email webhooks and seed scripts.
 */
const store = new AsyncLocalStorage<TenantContext>();

export class TenantResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantResolutionError";
  }
}

/** Run `fn` with an explicitly chosen tenant. */
export function runWithTenant<T>(tenant: TenantContext, fn: () => Promise<T>): Promise<T> {
  if (!tenant.spreadsheetId) {
    throw new TenantResolutionError("runWithTenant called without a spreadsheetId");
  }
  return store.run(tenant, fn);
}

/** The explicitly-set tenant, if we are inside runWithTenant(). */
export function getExplicitTenant(): TenantContext | undefined {
  return store.getStore();
}

/**
 * Resolve the spreadsheet the current request is allowed to touch.
 *
 * Prefers an explicit tenant, otherwise reads the signed-in user's session.
 * Throws when neither is available — there is deliberately no default, because
 * a default would silently write one customer's data into another's book.
 */
export async function getTenant(): Promise<TenantContext> {
  const explicit = store.getStore();
  if (explicit) return explicit;

  const session = await getServerSession(authOptions);
  if (!session) {
    throw new TenantResolutionError(
      "No tenant context: request has no session and was not wrapped in runWithTenant()"
    );
  }

  const { spreadsheetId, accountNo } = session as {
    spreadsheetId?: string;
    accountNo?: string;
  };
  if (!spreadsheetId) {
    throw new TenantResolutionError(
      "Signed-in user has no spreadsheetId — account is not provisioned"
    );
  }
  return {
    accountNo: accountNo ?? "",
    spreadsheetId,
    email: session.user?.email ?? undefined,
  };
}

export async function getTenantSpreadsheetId(): Promise<string> {
  // Fast path: avoid decoding the session when a tenant is already explicit.
  const explicit = store.getStore();
  if (explicit) return explicit.spreadsheetId;
  return (await getTenant()).spreadsheetId;
}
