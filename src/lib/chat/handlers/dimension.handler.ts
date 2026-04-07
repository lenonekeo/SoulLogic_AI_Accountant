import { IntentResult } from "@/types/api";
import { ChatContext, HandlerResult } from "../router";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Dimension } from "@/types/entities";
import { ChatIntent } from "@/types/enums";

export async function handleDimension(intent: IntentResult, ctx: ChatContext): Promise<HandlerResult> {
  const en = ctx.language !== "fr";

  if (intent.intent === ChatIntent.ListDimensions) {
    const dimensions = await readSheetAsObjects<Dimension>(SHEETS.Dimensions);
    const active = dimensions.filter((d) => d.Is_Active);
    const list = active.map((d) => `• Slot ${d.Dim_Slot}: ${d.Dimension_Name} (${d.Dimension_Code})`).join("\n");
    return {
      message: en
        ? `📐 Active dimensions:\n${list}`
        : `📐 Dimensions actives:\n${list}`,
    };
  }

  return {
    message: en
      ? "To edit dimensions, please use the web app at /dimensions."
      : "Pour modifier les dimensions, utilisez l'application web à /dimensions.",
  };
}
