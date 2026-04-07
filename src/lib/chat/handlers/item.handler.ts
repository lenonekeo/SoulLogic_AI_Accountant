import { IntentResult } from "@/types/api";
import { ChatContext, HandlerResult } from "../router";
import { formatCurrency } from "@/lib/utils/currency";

export async function handleItem(intent: IntentResult, ctx: ChatContext): Promise<HandlerResult> {
  const en = ctx.language !== "fr";
  const name = intent.entities.item_name;
  const price = intent.entities.amount;

  if (!name) {
    return { message: en ? "What is the item/service name?" : "Quel est le nom de l'article/service?" };
  }
  if (!price) {
    return { message: en ? `Item "${name}" — what is the unit price?` : `Article "${name}" — quel est le prix unitaire?` };
  }

  return {
    message: en
      ? `Create item "${name}" at ${formatCurrency(price)}. Confirm?`
      : `Créer l'article "${name}" à ${formatCurrency(price)}. Confirmer?`,
    requiresConfirmation: true,
    data: { itemName: name, unitPrice: price },
  };
}
