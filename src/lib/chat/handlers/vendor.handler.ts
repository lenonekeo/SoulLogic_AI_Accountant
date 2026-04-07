import { IntentResult } from "@/types/api";
import { ChatContext, HandlerResult } from "../router";
import { appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { RecordStatus, PaymentTerms, ID_PREFIXES } from "@/types/enums";
import { today } from "@/lib/utils/date";

function resolvePaymentTerms(raw?: string | null): PaymentTerms {
  if (!raw) return PaymentTerms.Net30;
  const s = raw.toLowerCase().replace(/\s+/g, "");
  if (s.includes("15")) return PaymentTerms.Net15;
  if (s.includes("45")) return PaymentTerms.Net45;
  if (s.includes("60")) return PaymentTerms.Net60;
  if (s.includes("cod") || s.includes("cash") || s.includes("receipt") || s.includes("due")) return PaymentTerms.DueOnReceipt;
  return PaymentTerms.Net30;
}

export async function handleVendor(intent: IntentResult, ctx: ChatContext): Promise<HandlerResult> {
  const en = ctx.language !== "fr";
  const e = intent.entities;
  const name = e.vendor_name;

  if (!name) {
    return {
      message: en
        ? "What is the vendor's company name?"
        : "Quel est le nom de l'entreprise fournisseur?",
    };
  }

  try {
    const vendorId = await nextId(SHEETS.Vendors, "Vendor_ID", ID_PREFIXES.Vendor);
    const terms = resolvePaymentTerms(e.payment_terms);

    const row = [
      vendorId,
      name,
      e.contact_name ?? "",
      e.email ?? "",
      e.phone ?? "",
      e.address ?? "",
      "",
      terms,
      "",
      0,
      RecordStatus.Active,
      today(),
      e.notes ?? "",
      ...dimensionArray({}),
    ];

    await appendRow(SHEETS.Vendors, row);

    return {
      message: en
        ? `✅ Vendor "${name}" created (${vendorId}). Payment terms: ${terms}.`
        : `✅ Fournisseur « ${name} » créé (${vendorId}). Conditions de paiement : ${terms}.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      message: en
        ? `❌ Failed to create vendor: ${msg}`
        : `❌ Échec de la création du fournisseur : ${msg}`,
    };
  }
}
