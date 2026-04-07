import { appendRow, findRowIndex, updateCell } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { ID_PREFIXES } from "@/types/enums";
import { PostingInput, PostingLine } from "@/types/api";
import { validateDimensions, dimensionArray } from "./dimensions";
import { nextId } from "./id-generator";
import { roundMoney } from "@/lib/utils/currency";
import { PostingError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export interface PostingResult {
  subledgerIds: string[];
  glIds: string[];
  errors: string[];
}

// ═══════════════════════════════════════════════════
// POSTING ENGINE — Two-layer: Subledger → GL → backfill
// CRITICAL INVARIANTS:
//   1. Source_Doc_URL MANDATORY before any post
//   2. NEVER write GL without Subledger first
//   3. Total Debits MUST equal Total Credits (tolerance $0.01)
//   4. Client_ID on every GL and Subledger row
// ═══════════════════════════════════════════════════
export async function postDocument(input: PostingInput): Promise<PostingResult> {
  const errors: string[] = [];

  // ── Pre-posting Validation ──

  // 1. Source_Doc_URL is MANDATORY
  if (!input.sourceDocUrl || input.sourceDocUrl.trim() === "") {
    throw new PostingError("Source_Doc_URL is mandatory before posting to Subledger/GL");
  }

  // 2. Validate dimensions on each line
  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i];
    const dimErrors = await validateDimensions({
      Dimension_1: line.dimensions?.dim1,
      Dimension_2: line.dimensions?.dim2,
      Dimension_3: line.dimensions?.dim3,
      Dimension_4: line.dimensions?.dim4,
      Dimension_5: line.dimensions?.dim5,
      Dimension_6: line.dimensions?.dim6,
      Dimension_7: line.dimensions?.dim7,
      Dimension_8: line.dimensions?.dim8,
    });
    dimErrors.forEach((e) => errors.push(`Line ${i + 1}: ${e.message}`));
  }

  // 3. Total Debits MUST equal Total Credits
  const totalDebits = roundMoney(input.lines.reduce((sum, l) => sum + l.debit, 0));
  const totalCredits = roundMoney(input.lines.reduce((sum, l) => sum + l.credit, 0));
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new PostingError(
      `Posting imbalance: Debits ${totalDebits} ≠ Credits ${totalCredits}`,
      [`Difference: ${Math.abs(totalDebits - totalCredits)}`]
    );
  }

  if (errors.length > 0) {
    throw new PostingError("Posting validation failed", errors);
  }

  const subledgerIds: string[] = [];
  const glIds: string[] = [];
  const postingDate = new Date().toISOString().split("T")[0];

  // ── Step 1: Write Subledger Lines ──
  for (const line of input.lines) {
    const slId = await nextId(SHEETS.Subledger, "SL_ID", ID_PREFIXES.SubledgerEntry);

    const dims = {
      Dimension_1: line.dimensions?.dim1 ?? "",
      Dimension_2: line.dimensions?.dim2 ?? "",
      Dimension_3: line.dimensions?.dim3 ?? "",
      Dimension_4: line.dimensions?.dim4 ?? "",
      Dimension_5: line.dimensions?.dim5 ?? "",
      Dimension_6: line.dimensions?.dim6 ?? "",
      Dimension_7: line.dimensions?.dim7 ?? "",
      Dimension_8: line.dimensions?.dim8 ?? "",
    };

    const slRow = [
      slId,
      input.postingDate,
      input.documentDate,
      input.documentNo,
      input.documentType,
      input.entityType,
      input.entityId,
      input.entityName,
      line.accountCode,
      line.accountName,
      line.itemNo ?? "",
      line.itemDescription,
      line.qty ?? "",
      line.price ?? "",
      line.amount,
      line.taxCode ?? "",
      line.taxAmount,
      line.debit,
      line.credit,
      "", // GL_ID — backfilled after GL posting
      input.clientId ?? "",
      input.sourceDocUrl, // MANDATORY
      input.sourceInput,
      input.postedBy,
      input.notes ?? "",
      ...dimensionArray(dims),
    ];

    await appendRow(SHEETS.Subledger, slRow);
    subledgerIds.push(slId);
    logger.info("Subledger row written", { slId, docNo: input.documentNo });
  }

  // ── Step 2: Write General Ledger Lines (1:1 with Subledger) ──
  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i];
    const slId = subledgerIds[i];
    const glId = await nextId(SHEETS.GeneralLedger, "GL_ID", ID_PREFIXES.GLEntry);

    const dims = {
      Dimension_1: line.dimensions?.dim1 ?? "",
      Dimension_2: line.dimensions?.dim2 ?? "",
      Dimension_3: line.dimensions?.dim3 ?? "",
      Dimension_4: line.dimensions?.dim4 ?? "",
      Dimension_5: line.dimensions?.dim5 ?? "",
      Dimension_6: line.dimensions?.dim6 ?? "",
      Dimension_7: line.dimensions?.dim7 ?? "",
      Dimension_8: line.dimensions?.dim8 ?? "",
    };

    const glDescription = `${input.documentType}: ${input.documentNo} — ${line.itemDescription}`;

    const glRow = [
      glId,
      input.documentDate,
      line.accountCode,
      line.accountName,
      glDescription,
      input.documentNo, // Reference
      line.debit,
      line.credit,
      0, // Balance — calculated by reports, not stored
      input.clientId ?? "",
      line.itemDescription, // Category
      input.sourceModule,
      postingDate, // Posted_Date
      input.postedBy, // Posted_By
      slId, // Subledger_ID FK
      input.sourceDocUrl, // Source_Doc_URL MANDATORY
      ...dimensionArray(dims),
    ];

    await appendRow(SHEETS.GeneralLedger, glRow);
    glIds.push(glId);
    logger.info("GL row written", { glId, slId, docNo: input.documentNo });
  }

  // ── Step 3: Backfill GL_ID onto Subledger Lines ──
  for (let i = 0; i < subledgerIds.length; i++) {
    const slId = subledgerIds[i];
    const glId = glIds[i];
    const rowIndex = await findRowIndex(SHEETS.Subledger, "SL_ID", slId);
    if (rowIndex !== -1) {
      await updateCell(SHEETS.Subledger, rowIndex, "GL_ID", glId);
    }
  }

  logger.info("Posting complete", {
    documentNo: input.documentNo,
    subledgerIds,
    glIds,
  });

  return { subledgerIds, glIds, errors: [] };
}
