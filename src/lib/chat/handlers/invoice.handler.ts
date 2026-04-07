import { IntentResult } from "@/types/api";
import { ChatIntent } from "@/types/enums";
import { ChatContext, HandlerResult } from "../router";
import { resolveEntities } from "@/lib/voice/entity-extractor";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { SalesInvoice } from "@/types/entities";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";

export async function handleInvoice(intent: IntentResult, ctx: ChatContext): Promise<HandlerResult> {
  const en = ctx.language !== "fr";

  if (intent.intent === ChatIntent.CreateInvoice) {
    const entities = await resolveEntities(intent);

    if (!entities.clientId) {
      return {
        message: en
          ? "To create an invoice, I need the client name. Which client is this for?"
          : "Pour créer une facture, j'ai besoin du nom du client. Pour quel client est-ce?",
      };
    }

    if (!intent.entities.items || intent.entities.items.length === 0) {
      return {
        message: en
          ? `Creating invoice for ${entities.clientName}. What items/services should be on this invoice?`
          : `Création d'une facture pour ${entities.clientName}. Quels articles/services doivent figurer sur cette facture?`,
      };
    }

    const total = intent.entities.items.reduce((s, i) => s + i.qty * i.price, 0);

    return {
      message: en
        ? `Ready to create invoice for ${entities.clientName}:\n${intent.entities.items.map((i) => `• ${i.name}: ${i.qty} × ${formatCurrency(i.price)} = ${formatCurrency(i.qty * i.price)}`).join("\n")}\nTotal: ${formatCurrency(total)}\n\nConfirm?`
        : `Prêt à créer une facture pour ${entities.clientName}:\n${intent.entities.items.map((i) => `• ${i.name}: ${i.qty} × ${formatCurrency(i.price)} = ${formatCurrency(i.qty * i.price)}`).join("\n")}\nTotal: ${formatCurrency(total)}\n\nConfirmer?`,
      requiresConfirmation: true,
      data: { clientId: entities.clientId, items: intent.entities.items, total },
    };
  }

  // ApproveInvoice
  if (intent.intent === ChatIntent.ApproveInvoice) {
    const invoiceId = intent.entities.invoice_id;
    if (!invoiceId) {
      const invoices = await readSheetAsObjects<SalesInvoice>(SHEETS.SalesInvoices);
      const pending = invoices.filter((i) => i.Status === "Draft");
      if (pending.length === 0) {
        return { message: en ? "No draft invoices to approve." : "Aucune facture en attente d'approbation." };
      }
      const list = pending.slice(0, 5).map((i) => `• ${i.Invoice_ID} — ${formatCurrency(Number(i.Total_Amount))}`).join("\n");
      return { message: en ? `Pending invoices:\n${list}\n\nWhich one to approve?` : `Factures en attente:\n${list}\n\nLaquelle approuver?` };
    }

    const res = await fetch(`/api/invoices/${invoiceId}/approve`, { method: "POST" });
    if (res.ok) {
      return { message: en ? `Invoice ${invoiceId} approved and posted to ledger. ✓` : `Facture ${invoiceId} approuvée et comptabilisée. ✓` };
    }
    return { message: en ? `Failed to approve invoice ${invoiceId}.` : `Échec de l'approbation de la facture ${invoiceId}.` };
  }

  return { message: en ? "Invoice action not recognized." : "Action de facture non reconnue." };
}
