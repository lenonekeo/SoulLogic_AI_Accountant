import { readSheetAsObjects } from "@/lib/google/sheets";
import { YEAR_BASED_PREFIXES, ID_PREFIXES } from "@/types/enums";

// ── Generate the next ID for a given prefix ──
// Non-year-based: PREFIX-NNN (e.g., CLI-001)
// Year-based: PREFIX-YYYY-NNNNNN (e.g., INV-2026-000001)
export async function nextId(
  sheetName: string,
  idColumn: string,
  prefix: string
): Promise<string> {
  const isYearBased = (YEAR_BASED_PREFIXES as Set<string>).has(prefix);
  const currentYear = new Date().getFullYear();

  // Read all existing IDs from the sheet
  type WithId = Record<string, string>;
  const rows = await readSheetAsObjects<WithId>(sheetName);
  const existingIds = rows.map((r) => r[idColumn]).filter(Boolean);

  if (isYearBased) {
    // Filter IDs matching PREFIX-CURRENTYEAR-*
    const yearPrefix = `${prefix}-${currentYear}-`;
    const sequences = existingIds
      .filter((id) => id.startsWith(yearPrefix))
      .map((id) => parseInt(id.replace(yearPrefix, ""), 10))
      .filter((n) => !isNaN(n));

    const maxSeq = sequences.length > 0 ? Math.max(...sequences) : 0;
    const nextSeq = (maxSeq + 1).toString().padStart(6, "0");
    return `${prefix}-${currentYear}-${nextSeq}`;
  } else {
    // Filter IDs matching PREFIX-NNN
    const sequences = existingIds
      .filter((id) => id.startsWith(`${prefix}-`))
      .map((id) => parseInt(id.replace(`${prefix}-`, ""), 10))
      .filter((n) => !isNaN(n));

    const maxSeq = sequences.length > 0 ? Math.max(...sequences) : 0;
    const nextSeq = (maxSeq + 1).toString().padStart(3, "0");
    return `${prefix}-${nextSeq}`;
  }
}
