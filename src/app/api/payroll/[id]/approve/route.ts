import { NextRequest } from "next/server";
import { readSheetAsObjects, updateById } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { PayrollEntry, Employee } from "@/types/entities";
import { PaymentStatus, SourceInput, SourceModule, DocType, EntityType } from "@/types/enums";
import { postDocument } from "@/lib/accounting/posting";
import { generatePaystubPdf } from "@/lib/pdf/paystub-template";
import { uploadDocument } from "@/lib/google/drive";
import { ok, error } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";
import { today } from "@/lib/utils/date";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;

    const [payroll, employees] = await Promise.all([
      readSheetAsObjects<PayrollEntry>(SHEETS.Payroll),
      readSheetAsObjects<Employee>(SHEETS.Employees),
    ]);

    const entry = payroll.find((p) => p.Payroll_ID === id);
    if (!entry) throw new NotFoundError("Payroll Entry", id);
    if (String(entry.GL_Posted) === "TRUE") return error("Payroll already posted", 400);

    const employee = employees.find((e) => e.Employee_ID === entry.Employee_ID);
    if (!employee) throw new NotFoundError("Employee", entry.Employee_ID);

    // 1. Generate pay stub PDF
    const pdfBuffer = await generatePaystubPdf(entry, employee);
    const year = (entry.Pay_Date || today()).slice(0, 4);
    const pdfUrl = await uploadDocument(
      pdfBuffer,
      `${entry.Payroll_ID}_${entry.Employee_ID}.pdf`,
      "PAYROLL", // Global payroll folder
      "Payroll",
      year
    );

    const empName = `${employee.First_Name} ${employee.Last_Name}`;

    const lines = [
      // Gross Pay Expense
      {
        accountCode: "5100",
        accountName: "Salaries & Wages",
        description: `Payroll ${entry.Payroll_ID} - ${empName}`,
        debit: Number(entry.Gross_Pay),
        credit: 0,
        itemDescription: `Gross Pay`,
        amount: Number(entry.Gross_Pay),
        taxCode: "",
        taxAmount: 0,
        dimensions: {},
      },
      // CPP/QPP Employer expense
      {
        accountCode: "5100",
        accountName: "Salaries & Wages",
        description: "CPP/QPP Employer",
        debit: Number(entry.CPP_QPP_Employer),
        credit: 0,
        itemDescription: "Employer pension contribution",
        amount: Number(entry.CPP_QPP_Employer),
        taxCode: "",
        taxAmount: 0,
        dimensions: {},
      },
      // EI Employer expense
      {
        accountCode: "5100",
        accountName: "Salaries & Wages",
        description: "EI Employer",
        debit: Number(entry.EI_Employer),
        credit: 0,
        itemDescription: "Employer EI contribution",
        amount: Number(entry.EI_Employer),
        taxCode: "",
        taxAmount: 0,
        dimensions: {},
      },
      // Payroll Liabilities (all withholdings)
      {
        accountCode: "2200",
        accountName: "Payroll Liabilities",
        description: "Payroll withholdings",
        debit: 0,
        credit:
          Number(entry.Federal_Tax) +
          Number(entry.Provincial_Tax) +
          Number(entry.CPP_QPP_Employee) +
          Number(entry.CPP_QPP_Employer) +
          Number(entry.EI_Employee) +
          Number(entry.EI_Employer) +
          (Number(entry.QPIP_Employee) || 0) +
          (Number(entry.QPIP_Employer) || 0),
        itemDescription: "Payroll taxes and deductions payable",
        amount: 0,
        taxCode: "",
        taxAmount: 0,
        dimensions: {},
      },
      // Net Pay credit (bank / cash)
      {
        accountCode: "1000",
        accountName: "Cash",
        description: `Net Pay ${empName}`,
        debit: 0,
        credit: Number(entry.Net_Pay),
        itemDescription: "Employee net pay",
        amount: Number(entry.Net_Pay),
        taxCode: "",
        taxAmount: 0,
        dimensions: {},
      },
    ];

    const postResult = await postDocument({
      documentNo: entry.Payroll_ID,
      documentDate: entry.Pay_Date || today(),
      postingDate: today(),
      documentType: DocType.Payroll,
      entityType: EntityType.Employee,
      entityId: entry.Employee_ID,
      entityName: empName,
      sourceModule: SourceModule.Payroll,
      sourceInput: SourceInput.WebApp,
      sourceDocUrl: pdfUrl,
      postedBy: "System",
      lines,
    });

    const updatedRow = [
      entry.Payroll_ID, entry.Employee_ID,
      entry.Pay_Period_Start, entry.Pay_Period_End,
      entry.Hours_Worked, entry.Hourly_Rate, entry.Gross_Pay,
      entry.Federal_Tax, entry.Provincial_Tax,
      entry.CPP_QPP_Employee, entry.CPP_QPP_Employer,
      entry.EI_Employee, entry.EI_Employer,
      entry.QPIP_Employee ?? 0, entry.QPIP_Employer ?? 0,
      entry.Other_Deductions, entry.Net_Pay,
      PaymentStatus.Completed, "TRUE", entry.Pay_Date || today(), entry.Notes ?? "",
      entry.Dimension_1 ?? "", entry.Dimension_2 ?? "",
      entry.Dimension_3 ?? "", entry.Dimension_4 ?? "",
      entry.Dimension_5 ?? "", entry.Dimension_6 ?? "",
      entry.Dimension_7 ?? "", entry.Dimension_8 ?? "",
    ];

    await updateById(SHEETS.Payroll, "Payroll_ID", id, updatedRow);
    return ok({ success: true, payrollId: id, pdfUrl, ...postResult });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error(err instanceof Error ? err.message : "Failed to approve payroll");
  }
}
