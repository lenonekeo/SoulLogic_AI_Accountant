import { IntentResult } from "@/types/api";
import { ChatContext, HandlerResult } from "../router";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { PurchaseInvoice } from "@/types/entities";
import { ChatIntent } from "@/types/enums";
import { formatCurrency } from "@/lib/utils/currency";

export async function handlePurchase(intent: IntentResult, ctx: ChatContext): Promise<HandlerResult> {
  const en = ctx.language !== "fr";
  const invoiceId = intent.entities.invoice_id;

  if (!invoiceId) {
    const purchases = await readSheetAsObjects<PurchaseInvoice>(SHEETS.PurchaseInvoices);
    const pending = purchases.filter((p) => p.Status === "Pending");
    if (pending.length === 0) {
      return { message: en ? "No pending purchase invoices." : "Aucune facture d'achat en attente." };
    }
    const list = pending.slice(0, 5).map((p) => `• ${p.PurchInv_ID} — ${formatCurrency(Number(p.Total_Amount))}`).join("\n");
    return {
      message: en
        ? `Pending purchase invoices:\n${list}\n\nWhich one to ${intent.intent === ChatIntent.ApprovePurchase ? "approve" : "reject"}?`
        : `Factures d'achat en attente:\n${list}\n\nLaquelle ${intent.intent === ChatIntent.ApprovePurchase ? "approuver" : "rejeter"}?`,
    };
  }

  if (intent.intent === ChatIntent.ApprovePurchase) {
    const res = await fetch(`/api/purchases/${invoiceId}/approve`, { method: "POST" });
    if (res.ok) return { message: en ? `Purchase invoice ${invoiceId} approved. ✓` : `Facture d'achat ${invoiceId} approuvée. ✓` };
    return { message: en ? `Failed to approve ${invoiceId}.` : `Échec de l'approbation de ${invoiceId}.` };
  }

  return { message: en ? `Purchase invoice ${invoiceId} rejected.` : `Facture d'achat ${invoiceId} rejetée.` };
}
