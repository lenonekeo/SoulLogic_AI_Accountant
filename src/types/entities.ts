import {
  AccountType,
  DocType,
  EntityType,
  InvoiceStatus,
  PayFrequency,
  PaymentMethod,
  PaymentStatus,
  PaymentTerms,
  Province,
  PurchaseStatus,
  ReceiptStatus,
  RecordStatus,
  SourceInput,
  SourceModule,
  ValuePostingRule,
  DimensionValueType,
} from "./enums";

// ═══════════════════════════════════════════════════
// DIMENSION FIELDS — Mixed into every entity
// ═══════════════════════════════════════════════════
export interface DimensionFields {
  Dimension_1?: string;
  Dimension_2?: string;
  Dimension_3?: string;
  Dimension_4?: string;
  Dimension_5?: string;
  Dimension_6?: string;
  Dimension_7?: string;
  Dimension_8?: string;
}

// ═══════════════════════════════════════════════════
// DIMENSION SYSTEM
// ═══════════════════════════════════════════════════
export interface Dimension extends DimensionFields {
  Dim_Slot: number; // 1-8
  Dimension_Code: string;
  Dimension_Name: string;
  Description?: string;
  Is_Required: boolean;
  Is_Active: boolean;
  Default_Value?: string;
  Blocking_Rule?: string;
  Created_Date: string;
  Notes?: string;
}

export interface DimensionValue extends DimensionFields {
  DimValue_ID: string;
  Dim_Slot: number;
  Dimension_Code: string;
  Value_Code: string;
  Value_Name: string;
  Parent_Value_Code?: string;
  Dimension_Type: DimensionValueType;
  Totaling?: string;
  Blocked: boolean;
  Is_Active: boolean;
  GL_Account_Filter?: string;
  Created_Date: string;
  Notes?: string;
}

export interface DefaultDimension {
  DefaultDim_ID: string;
  Table_Name: string;
  Record_ID: string;
  Dim_Slot: number;
  Dimension_Code: string;
  Value_Code: string;
  Value_Posting_Rule: ValuePostingRule;
  Notes?: string;
}

// ═══════════════════════════════════════════════════
// CHART OF ACCOUNTS
// ═══════════════════════════════════════════════════
export interface ChartOfAccount extends DimensionFields {
  Account_Code: string;
  Account_Name: string;
  Account_Type: AccountType;
  Sub_Category?: string;
  Is_Active: boolean;
}

// ═══════════════════════════════════════════════════
// TAX RATES
// ═══════════════════════════════════════════════════
export interface TaxRate extends DimensionFields {
  Tax_Code: string;
  Tax_Name: string;
  Rate: number;
  Province: Province;
  Effective_Date: string;
  Expiry_Date?: string;
  GL_Account_Code: string;
  Is_Active: boolean;
  Notes?: string;
}

// ═══════════════════════════════════════════════════
// MASTER DATA ENTITIES
// ═══════════════════════════════════════════════════
export interface Client extends DimensionFields {
  Client_ID: string;
  Company_Name: string;
  Contact_Name?: string;
  Email?: string;
  Phone?: string;
  Address?: string;
  Tax_ID?: string;
  Payment_Terms: PaymentTerms;
  Balance: number;
  Status: RecordStatus;
  Created_Date: string;
  Notes?: string;
}

export interface Vendor extends DimensionFields {
  Vendor_ID: string;
  Company_Name: string;
  Contact_Name?: string;
  Email?: string;
  Phone?: string;
  Address?: string;
  Tax_ID?: string;
  Payment_Terms: PaymentTerms;
  Default_Category?: string;
  Balance: number;
  Status: RecordStatus;
  Created_Date: string;
  Notes?: string;
}

export interface Item extends DimensionFields {
  Item_ID: string;
  Item_Name: string;
  Description?: string;
  Unit_Price: number;
  Cost_Price: number;
  Tax_Rate: number;
  Account_Code: string;
  Category?: string;
  Unit: string;
  Is_Active: boolean;
}

export interface Employee extends DimensionFields {
  Employee_ID: string;
  First_Name: string;
  Last_Name: string;
  Email?: string;
  Phone?: string;
  Address?: string;
  SIN?: string; // masked in display
  Date_of_Birth?: string;
  Hire_Date: string;
  Position?: string;
  Hourly_Rate: number;
  Pay_Frequency: PayFrequency;
  Province: Province;
  Status: RecordStatus;
  Notes?: string;
}

// ═══════════════════════════════════════════════════
// LINE ITEMS
// ═══════════════════════════════════════════════════
export interface LineItem extends DimensionFields {
  Item_ID?: string;
  Item_Name: string;
  Description?: string;
  Qty: number;
  Unit_Price: number;
  Amount: number;
  Tax_Code?: string;
  Tax_Amount: number;
}

export interface PurchaseLineItem extends DimensionFields {
  Description: string;
  Category?: string;
  Account_Code: string;
  Qty?: number;
  Unit_Price?: number;
  Amount: number;
  Tax_Code?: string;
  Tax_Amount: number;
}

// ═══════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════
export interface SalesInvoice extends DimensionFields {
  Invoice_ID: string;
  Client_ID: string;
  Client_Name?: string;
  Invoice_Date: string;
  Due_Date: string;
  Line_Items: string; // JSON string of LineItem[]
  Subtotal: number;
  Tax_Amount: number;
  Total_Amount: number;
  Amount_Paid: number;
  Balance_Due: number;
  Status: InvoiceStatus;
  GL_Posted: boolean;
  PDF_URL?: string;
  Notes?: string;
  Created_By?: string;
  Approved_By?: string;
  Approved_Date?: string;
}

export interface PurchaseInvoice extends DimensionFields {
  PurchInv_ID: string;
  Vendor_ID: string;
  Vendor_Name?: string;
  Vendor_Invoice_No?: string;
  Invoice_Date: string;
  Due_Date: string;
  Line_Items: string; // JSON string of PurchaseLineItem[]
  Subtotal: number;
  Tax_Amount: number;
  Total_Amount: number;
  Amount_Paid: number;
  Balance_Due: number;
  Status: PurchaseStatus;
  GL_Posted: boolean;
  PDF_URL?: string;
  Document_Name?: string;
  Source_Email?: string;
  Received_Date?: string;
  Approved_By?: string;
  Approved_Date?: string;
  Notes?: string;
}

export interface SalesReceipt extends DimensionFields {
  Receipt_ID: string;
  Client_ID: string;
  Client_Name?: string;
  Invoice_ID?: string;
  Receipt_Date: string;
  Amount: number;
  Payment_Method: PaymentMethod;
  Reference_Number?: string;
  Bank_ID?: string;
  Status: ReceiptStatus;
  GL_Posted: boolean;
  SL_Posted: boolean;
  Source_Doc_URL?: string;
  Notes?: string;
}

export interface Payment extends DimensionFields {
  Payment_ID: string;
  PurchInv_ID: string;
  Vendor_ID: string;
  Vendor_Name?: string;
  Payment_Date: string;
  Amount: number;
  Payment_Method: PaymentMethod;
  Reference_Number?: string;
  Status: PaymentStatus;
  GL_Posted: boolean;
  SL_Posted: boolean;
  Source_Doc_URL?: string;
  Notes?: string;
}

export interface PayrollEntry extends DimensionFields {
  Payroll_ID: string;
  Employee_ID: string;
  Employee_Name?: string;
  Pay_Period_Start: string;
  Pay_Period_End: string;
  Hours_Worked: number;
  Hourly_Rate: number;
  Gross_Pay: number;
  Federal_Tax: number;
  Provincial_Tax: number;
  CPP_QPP_Employee: number;
  CPP_QPP_Employer: number;
  EI_Employee: number;
  EI_Employer: number;
  QPIP_Employee?: number;
  QPIP_Employer?: number;
  Other_Deductions: number;
  Net_Pay: number;
  Status: PaymentStatus;
  GL_Posted: boolean;
  Pay_Date?: string;
  Notes?: string;
}

// ═══════════════════════════════════════════════════
// BANKING & CREDIT CARDS
// ═══════════════════════════════════════════════════
export interface CreditCard extends DimensionFields {
  CC_ID: string;
  Card_Name: string;
  Card_Number_Last4: string;
  Credit_Limit: number;
  Current_Balance: number;
  GL_Account_Code: string;
  Status: RecordStatus;
  Notes?: string;
}

export interface CCTransaction extends DimensionFields {
  CCT_ID: string;
  CC_ID: string;
  Transaction_Date: string;
  Description: string;
  Amount: number;
  Category?: string;
  Account_Code?: string;
  Vendor_Match?: string;
  GL_Posted: boolean;
  Status: RecordStatus;
  Notes?: string;
}

export interface BankAccount extends DimensionFields {
  Bank_ID: string;
  Bank_Name: string;
  Account_Name: string;
  Account_Number_Last4: string;
  Current_Balance: number;
  GL_Account_Code: string;
  Status: RecordStatus;
  Notes?: string;
}

export interface BankTransaction extends DimensionFields {
  BT_ID: string;
  Bank_ID: string;
  Transaction_Date: string;
  Description: string;
  Debit: number;
  Credit: number;
  Balance: number;
  Category?: string;
  Account_Code?: string;
  Matched_Reference?: string;
  GL_Posted: boolean;
  Status: RecordStatus;
  Notes?: string;
}

// ═══════════════════════════════════════════════════
// GENERAL LEDGER & SUBLEDGER
// ═══════════════════════════════════════════════════
export interface GLEntry extends DimensionFields {
  GL_ID: string;
  Date: string;
  Account_Code: string;
  Account_Name: string;
  Description: string;
  Reference: string;
  Debit: number;
  Credit: number;
  Balance: number;
  Client_ID?: string;
  Category?: string;
  Source_Module: SourceModule;
  Posted_Date: string;
  Posted_By: string;
  Subledger_ID: string;
  Source_Doc_URL: string;
}

export interface SubledgerEntry extends DimensionFields {
  SL_ID: string;
  Posting_Date: string;
  Document_Date: string;
  Document_No: string;
  Document_Type: DocType;
  Entity_Type: EntityType;
  Entity_ID: string;
  Entity_Name: string;
  Account_Code: string;
  Account_Name: string;
  Item_No?: string;
  Item_Description: string;
  Qty?: number;
  Price?: number;
  Amount: number;
  Tax_Code?: string;
  Tax_Amount: number;
  Debit: number;
  Credit: number;
  GL_ID?: string; // backfilled after GL posting
  Client_ID?: string;
  Source_Doc_URL: string; // MANDATORY
  Source_Input: SourceInput;
  Posted_By: string;
  Notes?: string;
}
