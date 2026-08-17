import { NextRequest } from "next/server";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { GLEntry, SubledgerEntry } from "@/types/entities";
import { ok, error } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const [glEntries, slEntries] = await Promise.all([
      readSheetAsObjects<GLEntry>(SHEETS.GeneralLedger),
      readSheetAsObjects<SubledgerEntry>(SHEETS.Subledger),
    ]);

    const glEntry = glEntries.find((e) => e.GL_ID === id);
    if (!glEntry) throw new NotFoundError("GL Entry", id);

    const relatedSL = slEntries.filter((sl) => sl.GL_ID === id);
    return ok({ ...glEntry, subledgerEntries: relatedSL });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to fetch GL entry");
  }
}
