import { NextRequest } from "next/server";
import { runHealthChecks } from "@/lib/health/checks";

export const runtime = "nodejs";
// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Pipeline health on demand.
 *
 * Behind the cron secret rather than a session: it is for the operator and for
 * uptime checks, and it reports which customers exist, so it must not be
 * readable by an ordinary signed-in user.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const report = await runHealthChecks();
  return Response.json(
    {
      ok: report.ok,
      checks: report.checks,
    },
    // Non-200 when unhealthy so a plain uptime monitor notices without parsing.
    { status: report.ok ? 200 : 503 }
  );
}
