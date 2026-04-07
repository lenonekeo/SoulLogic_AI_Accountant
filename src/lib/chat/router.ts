import { ChatIntent } from "@/types/enums";
import { IntentResult } from "@/types/api";
import { handleInvoice } from "./handlers/invoice.handler";
import { handlePurchase } from "./handlers/purchase.handler";
import { handlePayment } from "./handlers/payment.handler";
import { handleReceipt } from "./handlers/receipt.handler";
import { handlePayroll } from "./handlers/payroll.handler";
import { handleClient } from "./handlers/client.handler";
import { handleVendor } from "./handlers/vendor.handler";
import { handleItem } from "./handlers/item.handler";
import { handleReport } from "./handlers/report.handler";
import { handleApproval } from "./handlers/approval.handler";
import { handleDimension } from "./handlers/dimension.handler";

export interface ChatContext {
  userId: string;
  platform: string;
  sessionId?: string;
  language: "en" | "fr";
}

export interface HandlerResult {
  message: string;
  requiresConfirmation?: boolean;
  confirmationToken?: string;
  data?: unknown;
}

// ── Route intent to the correct handler ──
export async function routeIntent(
  intent: IntentResult,
  context: ChatContext
): Promise<HandlerResult> {
  const lang = intent.language ?? context.language ?? "en";
  const ctx = { ...context, language: lang };

  switch (intent.intent) {
    case ChatIntent.CreateInvoice:
    case ChatIntent.ApproveInvoice:
      return handleInvoice(intent, ctx);

    case ChatIntent.ApprovePurchase:
    case ChatIntent.RejectPurchase:
      return handlePurchase(intent, ctx);

    case ChatIntent.CreatePaymentBatch:
    case ChatIntent.ApprovePayment:
      return handlePayment(intent, ctx);

    case ChatIntent.RecordReceipt:
      return handleReceipt(intent, ctx);

    case ChatIntent.CreatePayroll:
    case ChatIntent.ApprovePayroll:
      return handlePayroll(intent, ctx);

    case ChatIntent.CreateClient:
      return handleClient(intent, ctx);

    case ChatIntent.CreateVendor:
      return handleVendor(intent, ctx);

    case ChatIntent.CreateItem:
      return handleItem(intent, ctx);

    case ChatIntent.ShowPnL:
    case ChatIntent.ShowBalanceSheet:
    case ChatIntent.ShowAging:
    case ChatIntent.ShowReport:
    case ChatIntent.ShowLedger:
    case ChatIntent.ShowSubledger:
      return handleReport(intent, ctx);

    case ChatIntent.Approve:
    case ChatIntent.Reject:
    case ChatIntent.Cancel:
      return handleApproval(intent, ctx);

    case ChatIntent.EditDimension:
    case ChatIntent.ListDimensions:
      return handleDimension(intent, ctx);

    case ChatIntent.GenericQuery:
    default:
      return {
        message: lang === "fr"
          ? "Je ne suis pas sûr de comprendre. Pouvez-vous reformuler votre demande?"
          : "I'm not sure I understand. Could you rephrase your request?",
      };
  }
}
