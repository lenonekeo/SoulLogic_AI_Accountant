import { NextRequest } from "next/server";
import { readSheetAsObjects, updateById, clearRowById } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Employee } from "@/types/entities";
import { EmployeeSchema } from "@/lib/validation/schemas";
import { dimensionArray } from "@/lib/accounting/dimensions";
import { ok, error, parseBody } from "@/lib/utils/api-helpers";
import { NotFoundError } from "@/lib/utils/errors";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const employees = await readSheetAsObjects<Employee>(SHEETS.Employees);
    const emp = employees.find((e) => e.Employee_ID === id);
    if (!emp) throw new NotFoundError("Employee", id);
    // Mask SIN for display
    const masked = { ...emp, SIN: emp.SIN ? "***-***-" + emp.SIN.slice(-3) : "" };
    return ok(masked);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to fetch employee");
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await parseBody(req, EmployeeSchema);
    const employees = await readSheetAsObjects<Employee>(SHEETS.Employees);
    const existing = employees.find((e) => e.Employee_ID === id);
    if (!existing) throw new NotFoundError("Employee", id);

    const row = [
      id, body.First_Name, body.Last_Name,
      body.Email ?? "", body.Phone ?? "", body.Address ?? "",
      body.SIN ?? existing.SIN ?? "", body.Date_of_Birth ?? "",
      body.Hire_Date, body.Position ?? "", body.Hourly_Rate,
      body.Pay_Frequency, body.Province,
      existing.Status, body.Notes ?? "",
      ...dimensionArray({ Dimension_1: body.Dimension_1, Dimension_2: body.Dimension_2, Dimension_3: body.Dimension_3, Dimension_4: body.Dimension_4, Dimension_5: body.Dimension_5, Dimension_6: body.Dimension_6, Dimension_7: body.Dimension_7, Dimension_8: body.Dimension_8 }),
    ];
    await updateById(SHEETS.Employees, "Employee_ID", id, row);
    return ok({ ...existing, ...body, Employee_ID: id });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to update employee");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const deleted = await clearRowById(SHEETS.Employees, "Employee_ID", id);
    if (!deleted) throw new NotFoundError("Employee", id);
    return ok({ success: true });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    console.error(err);
    return error("Failed to delete employee");
  }
}
