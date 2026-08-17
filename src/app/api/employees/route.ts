import { NextRequest } from "next/server";
import { readSheetAsObjects, appendRow } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Employee } from "@/types/entities";
import { ID_PREFIXES, RecordStatus, PayFrequency, Province } from "@/types/enums";
import { EmployeeSchema } from "@/lib/validation/schemas";
import { nextId } from "@/lib/accounting/id-generator";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    let employees = await readSheetAsObjects<Employee>(SHEETS.Employees);
    if (status) employees = employees.filter((e) => e.Status === status);
    return ok(employees);
  } catch (err) {
    console.error(err);
    return error("Failed to fetch employees");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, EmployeeSchema);
    const employeeId = await nextId(SHEETS.Employees, "Employee_ID", ID_PREFIXES.Employee);

    const row = [
      employeeId, body.First_Name, body.Last_Name,
      body.Email ?? "", body.Phone ?? "", body.Address ?? "",
      body.SIN ?? "", body.Date_of_Birth ?? "", body.Hire_Date,
      body.Position ?? "", body.Hourly_Rate,
      body.Pay_Frequency ?? PayFrequency.BiWeekly,
      body.Province ?? Province.QC,
      RecordStatus.Active, body.Notes ?? "",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];

    await appendRow(SHEETS.Employees, row);
    return ok({ Employee_ID: employeeId, ...body, Status: RecordStatus.Active }, 201);
  } catch (err) {
    console.error(err);
    return error("Failed to create employee");
  }
}
