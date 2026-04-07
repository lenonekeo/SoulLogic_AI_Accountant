import { SalesInvoice } from "@/types/entities";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";

export function formatInvoiceSummary(invoice: SalesInvoice, language: "en" | "fr" = "en"): string {
  const en = language !== "fr";
  return en
    ? `📄 Invoice ${invoice.Invoice_ID}\n👤 Client: ${invoice.Client_ID}\n📅 Date: ${formatDate(invoice.Invoice_Date)}\n⏰ Due: ${formatDate(invoice.Due_Date)}\n💰 Total: ${formatCurrency(Number(invoice.Total_Amount))}\n📊 Status: ${invoice.Status}`
    : `📄 Facture ${invoice.Invoice_ID}\n👤 Client: ${invoice.Client_ID}\n📅 Date: ${formatDate(invoice.Invoice_Date)}\n⏰ Échéance: ${formatDate(invoice.Due_Date)}\n💰 Total: ${formatCurrency(Number(invoice.Total_Amount))}\n📊 Statut: ${invoice.Status}`;
}
