import { NextRequest } from "next/server";
import { buildDailySummary } from "@/lib/reports/daily";
import { ok, error } from "@/lib/utils/api-helpers";
import { today } from "@/lib/utils/date";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? today();
    return ok(await buildDailySummary(date));
  } catch (err) {
    console.error(err);
    return error("Failed to generate daily report");
  }
}
