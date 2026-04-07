import { IntentResult } from "@/types/api";
import { ChatContext, HandlerResult } from "../router";
import { resolveEntities } from "@/lib/voice/entity-extractor";
import { formatCurrency } from "@/lib/utils/currency";

export async function handleReceipt(intent: IntentResult, ctx: ChatContext): Promise<HandlerResult> {
  const en = ctx.language !== "fr";
  const entities = await resolveEntities(intent);

  if (!entities.clientId) {
    return { message: en ? "Which client made this payment?" : "Quel client a effectué ce paiement?" };
  }
  if (!entities.amount) {
    return { message: en ? `Receipt for ${entities.clientName}. What amount was received?` : `Reçu pour ${entities.clientName}. Quel montant a été reçu?` };
  }

  return {
    message: en
      ? `Record receipt of ${formatCurrency(entities.amount)} from ${entities.clientName}. Confirm?`
      : `Enregistrer un reçu de ${formatCurrency(entities.amount)} de ${entities.clientName}. Confirmer?`,
    requiresConfirmation: true,
    data: { clientId: entities.clientId, clientName: entities.clientName, amount: entities.amount },
  };
}
