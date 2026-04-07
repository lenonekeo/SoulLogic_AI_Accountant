"use client";

import * as React from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import type { Employee } from "@/types/entities";

export default function EmployeesPage() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper
      title="Employees"
      description="Employee records for payroll"
      action={
        <Link href="/employees/new">
          <Button>New Employee</Button>
        </Link>
      }
    >
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Province</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-gray-100" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">No employees yet.</TableCell>
              </TableRow>
            ) : (
              employees.map((emp) => (
                <TableRow key={emp.Employee_ID}>
                  <TableCell>
                    <Link href={`/employees/${emp.Employee_ID}`} className="font-medium text-blue-600 hover:underline">
                      {emp.Employee_ID}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{emp.First_Name} {emp.Last_Name}</TableCell>
                  <TableCell>{emp.Email}</TableCell>
                  <TableCell>{emp.Province}</TableCell>
                  <TableCell>{emp.Position}</TableCell>
                  <TableCell>{emp.Pay_Frequency}</TableCell>
                  <TableCell><StatusBadge status={emp.Status} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
