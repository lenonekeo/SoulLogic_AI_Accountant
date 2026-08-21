import { google } from "googleapis";
import { getGoogleAuth } from "@/lib/google/auth";
import { listUnreadEmails } from "@/lib/google/gmail";
import { listAccounts, Account } from "@/lib/google/accounts";
import { invoiceSearchQuery } from "@/lib/google/invoice-query";
import { blobConfigured } from "@/lib/storage/documents";

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export interface HealthReport {
  checks: Check[];
  failing: Check[];
  ok: boolean;
}

async function attempt(name: string, fn: () => Promise<string>): Promise<Check> {
  try {
    return { name, ok: true, detail: await fn() };
  } catch (err) {
    return { name, ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Verify the pipeline can still do its job.
 *
 * These are live checks rather than a read of recorded state, because the
 * failures that actually happened here were silent: an expired Gmail token and
 * an unreadable registry both left the sweep returning zeros, which is
 * indistinguishable from "no invoices arrived today".
 */
export async function runHealthChecks(): Promise<HealthReport> {
  const checks: Check[] = [];
  let accounts: Account[] = [];

  checks.push(
    await attempt("Account registry readable", async () => {
      accounts = await listAccounts(false);
      const active = accounts.filter((a) => a.Status === "active").length;
      return `${accounts.length} account(s), ${active} active`;
    })
  );

  checks.push(
    await attempt("Gmail credentials valid", async () => {
      const messages = await listUnreadEmails(invoiceSearchQuery());
      return `${messages.length} candidate message(s) waiting`;
    })
  );

  // Each tenant's book must be reachable by the service account; a revoked
  // share here stops that customer's invoices being filed and nothing else
  // would report it.
  for (const account of accounts.filter((a) => a.Status === "active" && a.Spreadsheet_ID)) {
    checks.push(
      await attempt(`Book reachable for ${account.Account_No}`, async () => {
        const meta = await google
          .sheets({ version: "v4", auth: getGoogleAuth() })
          .spreadsheets.get({ spreadsheetId: account.Spreadsheet_ID, fields: "properties.title" });
        return `"${meta.data.properties?.title}"`;
      })
    );
  }

  const pending = accounts.filter((a) => a.Status === "pending");
  checks.push({
    name: "Accounts awaiting first sign-in",
    // Pending is normal briefly after checkout; only worth a look if it lingers.
    ok: true,
    detail: pending.length ? pending.map((a) => a.Account_No).join(", ") : "none",
  });

  checks.push({
    name: "Document storage",
    ok: true,
    detail: blobConfigured() ? "object store" : "Drive fallback (no object store configured)",
  });

  const failing = checks.filter((c) => !c.ok);
  return { checks, failing, ok: failing.length === 0 };
}

export function healthHtml(report: HealthReport): string {
  const rows = report.checks
    .map(
      (c) => `<tr>
        <td style="padding:4px 10px">${c.ok ? "✅" : "❌"}</td>
        <td style="padding:4px 10px">${c.name}</td>
        <td style="padding:4px 10px;color:#555">${c.detail}</td>
      </tr>`
    )
    .join("");
  return `<h3>Pipeline health</h3><table style="border-collapse:collapse">${rows}</table>`;
}

/**
 * Tell an external watchdog this run happened.
 *
 * Nothing inside this app can report that a cron failed to fire at all — no
 * code runs to say so. A dead-man's switch alerts on the absence of this ping.
 */
export async function pingWatchdog(outcome: "ok" | "fail"): Promise<void> {
  const base = process.env.HEALTHCHECK_PING_URL?.trim();
  if (!base) return;
  try {
    const url = outcome === "fail" ? `${base.replace(/\/$/, "")}/fail` : base;
    await fetch(url, { method: "POST" });
  } catch (err) {
    // Never let monitoring break the thing it monitors.
    console.warn("[health] watchdog ping failed:", err instanceof Error ? err.message : err);
  }
}
