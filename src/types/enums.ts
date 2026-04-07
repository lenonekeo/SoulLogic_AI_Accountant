// ═══════════════════════════════════════════════════
// ENUMS — Source of truth for all enumerated values
// ═══════════════════════════════════════════════════

// ── Document Types ──
export enum DocType {
  SalesInvoice = "Sales Invoice",
  PurchaseInvoice = "Purchase Invoice",
  SalesCashReceipt = "Sales Cash Receipt",
  PurchasePayment = "Purchase Payment",
  Payroll = "Payroll",
  CreditCard = "Credit Card",
  Bank = "Bank",
}

// ── Entity Types ──
export enum EntityType {
  Client = "Client",
  Vendor = "Vendor",
  Employee = "Employee",
}

// ── Invoice Status ──
export enum InvoiceStatus {
  Draft = "Draft",
  Sent = "Sent",
  Approved = "Approved",
  Paid = "Paid",
  Overdue = "Overdue",
  Void = "Void",
}

// ── Purchase Invoice Status ──
export enum PurchaseStatus {
  Pending = "Pending",
  Approved = "Approved",
  Paid = "Paid",
  Void = "Void",
}

// ── Payment Status ──
export enum PaymentStatus {
  Draft = "Draft",
  Approved = "Approved",
  Completed = "Completed",
}

// ── Receipt Status ──
export enum ReceiptStatus {
  Draft = "Draft",
  Approved = "Approved",
  Completed = "Completed",
}

// ── Account Types (Chart of Accounts) ──
export enum AccountType {
  Asset = "Asset",
  Liability = "Liability",
  Equity = "Equity",
  Revenue = "Revenue",
  Expense = "Expense",
}

// ── Payment Terms ──
export enum PaymentTerms {
  Net15 = "Net 15",
  Net30 = "Net 30",
  Net45 = "Net 45",
  Net60 = "Net 60",
  DueOnReceipt = "Due on Receipt",
}

// ── Payment Method ──
export enum PaymentMethod {
  Check = "Check",
  EFT = "EFT",
  Wire = "Wire",
  CreditCard = "Credit Card",
  Cash = "Cash",
}

// ── Record Status ──
export enum RecordStatus {
  Active = "Active",
  Inactive = "Inactive",
}

// ── Source Module (for GL) ──
export enum SourceModule {
  Sales = "Sales",
  Purchase = "Purchase",
  Payment = "Payment",
  Receipt = "Receipt",
  Payroll = "Payroll",
  CreditCard = "Credit Card",
  Bank = "Bank",
  Manual = "Manual",
}

// ── Source Input Type ──
export enum SourceInput {
  WebApp = "WebApp",
  Email = "Email 📧",
  CSV = "CSV",
  PDF = "PDF",
  Voice = "Voice 🎤",
}

// ── Dimension Value Type ──
export enum DimensionValueType {
  Standard = "Standard",
  Heading = "Heading",
  Total = "Total",
}

// ── Value Posting Rule ──
export enum ValuePostingRule {
  CodeMandatory = "CodeMandatory",
  SameCode = "SameCode",
  NoCode = "NoCode",
  Blank = "Blank",
}

// ── Pay Frequency ──
export enum PayFrequency {
  Weekly = "Weekly",
  BiWeekly = "Bi-Weekly",
  SemiMonthly = "Semi-Monthly",
  Monthly = "Monthly",
}

// ── Canadian Province ──
export enum Province {
  AB = "AB",
  BC = "BC",
  MB = "MB",
  NB = "NB",
  NL = "NL",
  NS = "NS",
  NT = "NT",
  NU = "NU",
  ON = "ON",
  PE = "PE",
  QC = "QC",
  SK = "SK",
  YT = "YT",
}

// ── Chat Intent ──
export enum ChatIntent {
  CreateInvoice = "CreateInvoice",
  ApproveInvoice = "ApproveInvoice",
  CreateClient = "CreateClient",
  CreateVendor = "CreateVendor",
  CreateItem = "CreateItem",
  ApprovePurchase = "ApprovePurchase",
  RejectPurchase = "RejectPurchase",
  CreatePaymentBatch = "CreatePaymentBatch",
  ApprovePayment = "ApprovePayment",
  RecordReceipt = "RecordReceipt",
  CreatePayroll = "CreatePayroll",
  ApprovePayroll = "ApprovePayroll",
  ShowReport = "ShowReport",
  ShowPnL = "ShowPnL",
  ShowBalanceSheet = "ShowBalanceSheet",
  ShowAging = "ShowAging",
  ShowLedger = "ShowLedger",
  ShowSubledger = "ShowSubledger",
  EditDimension = "EditDimension",
  ListDimensions = "ListDimensions",
  GenerateStatement = "GenerateStatement",
  GenericQuery = "GenericQuery",
  Approve = "Approve",
  Reject = "Reject",
  Cancel = "Cancel",
}

// ── ID Prefixes ──
export const ID_PREFIXES = {
  Client: "CLI",
  Vendor: "VEN",
  Item: "ITM",
  Employee: "EMP",
  Invoice: "INV",
  PurchaseInvoice: "PINV",
  Payment: "PMNT",
  Receipt: "REC",
  Payroll: "PAY",
  CreditCard: "CC",
  CCTransaction: "CCT",
  BankAccount: "BANK",
  BankTransaction: "BT",
  GLEntry: "GL",
  SubledgerEntry: "SL",
  DimensionValue: "DV",
  DefaultDimension: "DD",
} as const;

// ── Year-based ID prefixes (PREFIX-YYYY-NNNNNN) ──
export const YEAR_BASED_PREFIXES = new Set([
  ID_PREFIXES.Invoice,
  ID_PREFIXES.PurchaseInvoice,
  ID_PREFIXES.Payment,
  ID_PREFIXES.Receipt,
  ID_PREFIXES.Payroll,
  ID_PREFIXES.GLEntry,
  ID_PREFIXES.SubledgerEntry,
]);
