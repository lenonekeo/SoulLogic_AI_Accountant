import { ValuePostingRule } from "@/types/enums";

export interface DimensionRuleViolation {
  slot: number;
  rule: ValuePostingRule;
  message: string;
}

// ── Validate dimension value against posting rule ──
export function checkValuePostingRule(
  slot: number,
  value: string | undefined,
  rule: ValuePostingRule,
  expectedCode?: string
): DimensionRuleViolation | null {
  switch (rule) {
    case ValuePostingRule.CodeMandatory:
      if (!value || value.trim() === "") {
        return {
          slot,
          rule,
          message: `Dimension ${slot}: A value is mandatory for this posting`,
        };
      }
      break;

    case ValuePostingRule.SameCode:
      if (!value || value !== expectedCode) {
        return {
          slot,
          rule,
          message: `Dimension ${slot}: Value must match '${expectedCode}', got '${value}'`,
        };
      }
      break;

    case ValuePostingRule.NoCode:
      if (value && value.trim() !== "") {
        return {
          slot,
          rule,
          message: `Dimension ${slot}: No value is allowed for this posting`,
        };
      }
      break;

    case ValuePostingRule.Blank:
      // No restriction
      break;
  }

  return null;
}
