import { IntentResult } from "@/types/api";
import { ChatContext, HandlerResult } from "../router";
import { ChatIntent } from "@/types/enums";

export async function handleApproval(intent: IntentResult, ctx: ChatContext): Promise<HandlerResult> {
  const en = ctx.language !== "fr";

  if (intent.intent === ChatIntent.Approve) {
    return {
      message: en ? "Confirmed ✓ — action approved." : "Confirmé ✓ — action approuvée.",
      data: { confirmed: true },
    };
  }

  if (intent.intent === ChatIntent.Cancel) {
    return {
      message: en ? "Action cancelled." : "Action annulée.",
      data: { confirmed: false },
    };
  }

  return {
    message: en ? "Action rejected." : "Action rejetée.",
    data: { confirmed: false },
  };
}
