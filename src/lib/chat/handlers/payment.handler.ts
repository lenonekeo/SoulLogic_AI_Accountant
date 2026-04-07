import { IntentResult } from "@/types/api";
import { ChatContext, HandlerResult } from "../router";
import { resolveEntities } from "@/lib/voice/entity-extractor";
import { formatCurrency } from "@/lib/utils/currency";

export async function handlePayment(intent: IntentResult, ctx: ChatContext): Promise<HandlerResult> {
  const en = ctx.language !== "fr";
  const entities = await resolveEntities(intent);

  if (!entities.vendorId) {
    return { message: en ? "Which vendor is this payment for?" : "Pour quel fournisseur est ce paiement?" };
  }

  if (!entities.amount) {
    return { message: en ? `Payment for ${entities.vendorName}. What amount?` : `Paiement pour ${entities.vendorName}. Quel montant?` };
  }

  return {
    message: en
      ? `Ready to create payment of ${formatCurrency(entities.amount)} to ${entities.vendorName}. Confirm?`
      : `Prêt à créer un paiement de ${formatCurrency(entities.amount)} à ${entities.vendorName}. Confirmer?`,
    requiresConfirmation: true,
    data: { vendorId: entities.vendorId, vendorName: entities.vendorName, amount: entities.amount },
  };
}
