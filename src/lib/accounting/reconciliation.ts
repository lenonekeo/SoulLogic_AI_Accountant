import { BankTransaction, CCTransaction } from "@/types/entities";

export interface ReconciliationMatch {
  transactionId: string;
  matchedReference: string;
  confidence: number; // 0-1
  matchReason: string;
}

// ── Attempt to match a bank/CC transaction to an existing document ──
export function matchTransaction(
  description: string,
  amount: number,
  knownReferences: Array<{ id: string; description: string; amount: number; reference?: string }>
): ReconciliationMatch | null {
  let bestMatch: ReconciliationMatch | null = null;
  let bestScore = 0;

  for (const ref of knownReferences) {
    let score = 0;
    let reason = "";

    // Exact amount match
    if (Math.abs(ref.amount - amount) < 0.01) {
      score += 0.5;
      reason += "amount match; ";
    }

    // Reference number match
    if (ref.reference && description.includes(ref.reference)) {
      score += 0.4;
      reason += "reference match; ";
    }

    // Description similarity (simple substring)
    const descLower = description.toLowerCase();
    const refLower = ref.description.toLowerCase();
    const words = refLower.split(" ").filter((w) => w.length > 3);
    const matchedWords = words.filter((w) => descLower.includes(w));
    if (words.length > 0) {
      score += (matchedWords.length / words.length) * 0.1;
      if (matchedWords.length > 0) reason += `description words: ${matchedWords.join(",")}; `;
    }

    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = {
        transactionId: ref.id,
        matchedReference: ref.reference ?? ref.id,
        confidence: Math.min(1, score),
        matchReason: reason.trim(),
      };
    }
  }

  return bestMatch;
}

// ── Parse a bank statement CSV row ──
export interface ParsedBankRow {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export function parseBankCsvRow(row: string[]): ParsedBankRow | null {
  if (row.length < 4) return null;

  const [date, description, debitStr, creditStr, balanceStr] = row;

  if (!date || !description) return null;

  return {
    date: date.trim(),
    description: description.trim(),
    debit: parseFloat(debitStr?.replace(/[$,]/g, "") ?? "0") || 0,
    credit: parseFloat(creditStr?.replace(/[$,]/g, "") ?? "0") || 0,
    balance: parseFloat(balanceStr?.replace(/[$,]/g, "") ?? "0") || 0,
  };
}
