import { ChatIntent } from "./enums";

// ═══════════════════════════════════════════════════
// API REQUEST / RESPONSE TYPES
// ═══════════════════════════════════════════════════

// ── Generic API Response ──
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiListResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

// ── Pagination / Filter Query Params ──
export interface ListQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  client_id?: string;
  vendor_id?: string;
  date_from?: string;
  date_to?: string;
  dim1?: string;
  dim2?: string;
  dim3?: string;
  dim4?: string;
  dim5?: string;
  dim6?: string;
  dim7?: string;
  dim8?: string;
}

// ── Report Query Params ──
export interface ReportQueryParams {
  from?: string;
  to?: string;
  as_of?: string;
  type?: "ar" | "ap";
  dim1?: string;
  dim2?: string;
  dim3?: string;
  dim4?: string;
}

// ── Approval Response ──
export interface ApproveResponse {
  success: boolean;
  subledgerIds: string[];
  glIds: string[];
  pdfUrl?: string;
  errors: string[];
}

// ── Posting Input ──
export interface PostingLine {
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  itemNo?: string;
  itemDescription: string;
  qty?: number;
  price?: number;
  amount: number;
  taxCode?: string;
  taxAmount: number;
  dimensions?: Record<string, string>;
}

export interface PostingInput {
  documentNo: string;
  documentDate: string;
  postingDate: string;
  documentType: string;
  entityType: string;
  entityId: string;
  entityName: string;
  sourceModule: string;
  sourceInput: string;
  sourceDocUrl: string;
  clientId?: string;
  postedBy: string;
  notes?: string;
  lines: PostingLine[];
}

// ── Chat Types ──
export interface ChatMessage {
  text: string;
  platform?: string;
  userId?: string;
}

export interface ChatCommandRequest {
  text: string;
  userId: string;
  platform: string;
  sessionId?: string;
}

export interface ChatCommandResponse {
  message: string;
  requiresConfirmation?: boolean;
  confirmationToken?: string;
  data?: unknown;
}

export interface IntentResult {
  intent: ChatIntent;
  entities: {
    client_name?: string | null;
    vendor_name?: string | null;
    employee_name?: string | null;
    item_name?: string | null;
    invoice_id?: string | null;
    amount?: number | null;
    email?: string | null;
    phone?: string | null;
    contact_name?: string | null;
    address?: string | null;
    payment_terms?: string | null;
    notes?: string | null;
    items?: Array<{ name: string; qty: number; price: number }>;
    dimensions?: Record<string, string>;
    date_range?: { from: string; to: string } | null;
    report_type?: "pnl" | "balance_sheet" | "aging" | "cashflow" | null;
  };
  language: "en" | "fr";
  confidence: number;
}

// ── Voice Types ──
export interface TranscriptionResult {
  text: string;
  language: "en" | "fr";
  confidence: number;
  duration: number;
}

export interface VoiceCommandRequest {
  audio: string; // base64
  platform: string;
  userId: string;
  mimeType?: string;
}

// ── Report Types ──
export interface PnLReport {
  period: { from: string; to: string };
  revenue: Array<{ account: string; name: string; amount: number }>;
  expenses: Array<{ account: string; name: string; amount: number }>;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export interface BalanceSheetReport {
  asOf: string;
  assets: Array<{ account: string; name: string; balance: number }>;
  liabilities: Array<{ account: string; name: string; balance: number }>;
  equity: Array<{ account: string; name: string; balance: number }>;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface AgingReport {
  type: "ar" | "ap";
  asOf: string;
  rows: Array<{
    entity: string;
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
    total: number;
  }>;
  totals: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
    total: number;
  };
}

export interface CashFlowReport {
  period: { from: string; to: string };
  openingBalance: number;
  receipts: number;
  payments: number;
  closingBalance: number;
  details: Array<{ date: string; description: string; amount: number; balance: number }>;
}

// ── Upload Response ──
export interface UploadResponse {
  success: boolean;
  processed: number;
  errors: string[];
  transactionIds: string[];
}

// ── Email Types ──
export interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}
