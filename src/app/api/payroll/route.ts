import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { PayrollEntry, Employee } from "@/types/entities";
import { ID_PREFIXES, PaymentStatus, Province } from "@/types/enums";
import { PayrollSchema } from "@/lib/validation/schemas";
import { nextId } from "@/lib/accounting/id-generator";
import { calculatePayroll } from "@/lib/accounting/payroll-calc";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const empId = searchParams.get("employee");
    let payroll = await readSheetAsObjects<PayrollEntry>(SHEETS.Payroll);
    if (empId) payroll = payroll.filter((p) => p.Employee_ID === empId);
    return ok(payroll);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch payroll");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, PayrollSchema);

    const employees = await readSheetAsObjects<Employee>(SHEETS.Employees);
    const employee = employees.find((e) => e.Employee_ID === body.Employee_ID);
    if (!employee) return error(`Employee ${body.Employee_ID} not found`, 404);

    const payrollId = await nextId(SHEETS.Payroll, "Payroll_ID", ID_PREFIXES.Payroll);
    const hourlyRate = body.Hourly_Rate || Number(employee.Hourly_Rate);
    const deductions = calculatePayroll(body.Hours_Worked, hourlyRate, (employee.Province as Province) ?? Province.QC);

    const row = [
      payrollId, body.Employee_ID,
      body.Pay_Period_Start, body.Pay_Period_End,
      body.Hours_Worked, hourlyRate,
      deductions.grossPay, deductions.federalTax, deductions.provincialTax,
      deductions.cppQppEmployee, deductions.cppQppEmployer,
      deductions.eiEmployee, deductions.eiEmployer,
      deductions.qpipEmployee, deductions.qpipEmployer,
      0, deductions.netPay,
      PaymentStatus.Draft, "FALSE", body.Pay_Date ?? "", body.Notes ?? "",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];

    await appendRow(SHEETS.Payroll, row);
    return ok({ Payroll_ID: payrollId, ...body, ...deductions, Status: PaymentStatus.Draft, GL_Posted: false }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create payroll entry");
  }
}
