import { AsyncLocalStorage } from "async_hooks";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export interface TenantContext {
  accountNo: string;
  spreadsheetId: string;
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
export async function getTenantSpreadsheetId(): Promise<string> {
  const explicit = store.getStore();
  if (explicit) return explicit.spreadsheetId;

  const session = await getServerSession(authOptions);
  if (!session) {
    throw new TenantResolutionError(
      "No tenant context: request has no session and was not wrapped in runWithTenant()"
    );
  }

  const spreadsheetId = (session as { spreadsheetId?: string }).spreadsheetId;
  if (!spreadsheetId) {
    throw new TenantResolutionError(
      "Signed-in user has no spreadsheetId — account is not provisioned"
    );
  }
  return spreadsheetId;
}
