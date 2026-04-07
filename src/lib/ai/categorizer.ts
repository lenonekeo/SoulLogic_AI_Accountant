import { askClaudeJson } from "./claude";
import { EXPENSE_CATEGORIZER_PROMPT } from "./prompts";

export interface CategorizationResult {
  suggestedAccount: string;
  accountName: string;
  category: string;
  dimensions: {
    dim1?: string;
    dim2?: string;
  };
  confidence: number;
  reasoning: string;
}

// ── Suggest GL account code and dimensions for an expense ──
export async function categorizeExpense(
  description: string,
  vendorName?: string,
  amount?: number
): Promise<CategorizationResult> {
  const context = [
    `Description: ${description}`,
    vendorName ? `Vendor: ${vendorName}` : "",
    amount !== undefined ? `Amount: $${amount.toFixed(2)} CAD` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await askClaudeJson<CategorizationResult>(
      EXPENSE_CATEGORIZER_PROMPT,
      context
    );

    return result;
  } catch (err) {
    console.error("Categorization failed:", err);
    return {
      suggestedAccount: "6000",
      accountName: "Other Expenses",
      category: "Uncategorized",
      dimensions: {},
      confidence: 0,
      reasoning: "Auto-categorization failed — defaulted to Other Expenses",
    };
  }
}
