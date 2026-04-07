import { z } from "zod";
import { PaymentTerms, PaymentMethod, PayFrequency, Province } from "@/types/enums";

// ── Shared dimension fields schema ──
const dimensionFields = {
  Dimension_1: z.string().optional(),
  Dimension_2: z.string().optional(),
  Dimension_3: z.string().optional(),
  Dimension_4: z.string().optional(),
  Dimension_5: z.string().optional(),
  Dimension_6: z.string().optional(),
  Dimension_7: z.string().optional(),
  Dimension_8: z.string().optional(),
};

// ── Client ──
export const ClientSchema = z.object({
  Company_Name: z.string().min(1, "Company name is required"),
  Contact_Name: z.string().optional(),
  Email: z.string().email().optional().or(z.literal("")),
  Phone: z.string().optional(),
  Address: z.string().optional(),
  Tax_ID: z.string().optional(),
  Payment_Terms: z.nativeEnum(PaymentTerms).default(PaymentTerms.Net30),
  Notes: z.string().optional(),
  ...dimensionFields,
});

// ── Vendor ──
export const VendorSchema = z.object({
  Company_Name: z.string().min(1, "Company name is required"),
  Contact_Name: z.string().optional(),
  Email: z.string().email().optional().or(z.literal("")),
  Phone: z.string().optional(),
  Address: z.string().optional(),
  Tax_ID: z.string().optional(),
  Payment_Terms: z.nativeEnum(PaymentTerms).default(PaymentTerms.Net30),
  Default_Category: z.string().optional(),
  Notes: z.string().optional(),
  ...dimensionFields,
});

// ── Item ──
export const ItemSchema = z.object({
  Item_Name: z.string().min(1, "Item name is required"),
  Description: z.string().optional(),
  Unit_Price: z.number().min(0),
  Cost_Price: z.number().min(0).default(0),
  Tax_Rate: z.number().min(0).default(0.14975), // GST + QST
  Account_Code: z.string().default("4010"),
  Category: z.string().optional(),
  Unit: z.string().default("ea"),
  ...dimensionFields,
});

// ── Employee ──
export const EmployeeSchema = z.object({
  First_Name: z.string().min(1, "First name is required"),
  Last_Name: z.string().min(1, "Last name is required"),
  Email: z.string().email().optional().or(z.literal("")),
  Phone: z.string().optional(),
  Address: z.string().optional(),
  SIN: z
    .string()
    .regex(/^\d{3}-\d{3}-\d{3}$/, "SIN must be in format 123-456-789")
    .optional()
    .or(z.literal("")),
  Date_of_Birth: z.string().optional(),
  Hire_Date: z.string().min(1, "Hire date is required"),
  Position: z.string().optional(),
  Hourly_Rate: z.number().min(0),
  Pay_Frequency: z.nativeEnum(PayFrequency).default(PayFrequency.BiWeekly),
  Province: z.nativeEnum(Province).default(Province.QC),
  Notes: z.string().optional(),
  ...dimensionFields,
});

// ── Line Item (Sales) ──
export const LineItemSchema = z.object({
  Item_ID: z.string().optional(),
  Item_Name: z.string().min(1),
  Description: z.string().optional(),
  Qty: z.number().min(0.01, "Quantity must be greater than 0"),
  Unit_Price: z.number().min(0),
  Amount: z.number().min(0),
  Tax_Code: z.string().optional(),
  Tax_Amount: z.number().min(0).default(0),
  ...dimensionFields,
});

// ── Purchase Line Item ──
export const PurchaseLineItemSchema = z.object({
  Description: z.string().min(1, "Description is required"),
  Category: z.string().optional(),
  Account_Code: z.string().min(1, "Account code is required"),
  Qty: z.number().optional(),
  Unit_Price: z.number().optional(),
  Amount: z.number().min(0),
  Tax_Code: z.string().optional(),
  Tax_Amount: z.number().min(0).default(0),
  ...dimensionFields,
});

// ── Sales Invoice ──
export const SalesInvoiceSchema = z.object({
  Client_ID: z.string().min(1, "Client is required"),
  Invoice_Date: z.string().min(1, "Invoice date is required"),
  Due_Date: z.string().min(1, "Due date is required"),
  Line_Items: z.array(LineItemSchema).min(1, "At least one line item is required"),
  Notes: z.string().optional(),
  ...dimensionFields,
});

// ── Purchase Invoice ──
export const PurchaseInvoiceSchema = z.object({
  Vendor_ID: z.string().min(1, "Vendor is required"),
  Vendor_Invoice_No: z.string().optional(),
  Invoice_Date: z.string().min(1, "Invoice date is required"),
  Due_Date: z.string().min(1, "Due date is required"),
  Line_Items: z.array(PurchaseLineItemSchema).min(1, "At least one line item is required"),
  Notes: z.string().optional(),
  ...dimensionFields,
});

// ── Sales Receipt ──
export const SalesReceiptSchema = z.object({
  Client_ID: z.string().min(1, "Client is required"),
  Invoice_ID: z.string().optional(),
  Receipt_Date: z.string().min(1, "Receipt date is required"),
  Amount: z.number().min(0.01, "Amount must be greater than 0"),
  Payment_Method: z.nativeEnum(PaymentMethod),
  Reference_Number: z.string().optional(),
  Bank_ID: z.string().optional(),
  Notes: z.string().optional(),
  ...dimensionFields,
});

// ── Payment ──
export const PaymentSchema = z.object({
  PurchInv_ID: z.string().min(1, "Purchase invoice is required"),
  Vendor_ID: z.string().min(1, "Vendor is required"),
  Payment_Date: z.string().min(1, "Payment date is required"),
  Amount: z.number().min(0.01, "Amount must be greater than 0"),
  Payment_Method: z.nativeEnum(PaymentMethod),
  Reference_Number: z.string().optional(),
  Notes: z.string().optional(),
  ...dimensionFields,
});

// ── Payroll ──
export const PayrollSchema = z.object({
  Employee_ID: z.string().min(1, "Employee is required"),
  Pay_Period_Start: z.string().min(1, "Pay period start is required"),
  Pay_Period_End: z.string().min(1, "Pay period end is required"),
  Hours_Worked: z.number().min(0, "Hours must be non-negative"),
  Hourly_Rate: z.number().min(0, "Rate must be non-negative"),
  Pay_Date: z.string().optional(),
  Notes: z.string().optional(),
  ...dimensionFields,
});

// ── Credit Card ──
export const CreditCardSchema = z.object({
  Card_Name: z.string().min(1, "Card name is required"),
  Card_Number_Last4: z.string().length(4, "Must be exactly 4 digits").regex(/^\d{4}$/),
  Credit_Limit: z.number().min(0).default(0),
  GL_Account_Code: z.string().default("2300"),
  Notes: z.string().optional(),
  ...dimensionFields,
});

// ── Bank Account ──
export const BankAccountSchema = z.object({
  Bank_Name: z.string().min(1, "Bank name is required"),
  Account_Name: z.string().min(1, "Account name is required"),
  Account_Number_Last4: z.string().length(4, "Must be exactly 4 digits").regex(/^\d{4}$/),
  GL_Account_Code: z.string().default("1000"),
  Notes: z.string().optional(),
  ...dimensionFields,
});

// ── Chart of Account ──
export const ChartOfAccountSchema = z.object({
  Account_Code: z.string().min(1, "Account code is required"),
  Account_Name: z.string().min(1, "Account name is required"),
  Account_Type: z.enum(["Asset", "Liability", "Equity", "Revenue", "Expense"]),
  Sub_Category: z.string().optional(),
  ...dimensionFields,
});

// ── Tax Rate ──
export const TaxRateSchema = z.object({
  Tax_Code: z.string().min(1, "Tax code is required"),
  Tax_Name: z.string().min(1, "Tax name is required"),
  Rate: z.number().min(0).max(1, "Rate must be between 0 and 1"),
  Province: z.nativeEnum(Province),
  Effective_Date: z.string().min(1),
  Expiry_Date: z.string().optional(),
  GL_Account_Code: z.string().default("2100"),
  Notes: z.string().optional(),
});

export type ClientInput = z.infer<typeof ClientSchema>;
export type VendorInput = z.infer<typeof VendorSchema>;
export type ItemInput = z.infer<typeof ItemSchema>;
export type EmployeeInput = z.infer<typeof EmployeeSchema>;
export type SalesInvoiceInput = z.infer<typeof SalesInvoiceSchema>;
export type PurchaseInvoiceInput = z.infer<typeof PurchaseInvoiceSchema>;
export type SalesReceiptInput = z.infer<typeof SalesReceiptSchema>;
export type PaymentInput = z.infer<typeof PaymentSchema>;
export type PayrollInput = z.infer<typeof PayrollSchema>;
