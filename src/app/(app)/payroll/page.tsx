"use client";

import * as React from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { SourceDocLink } from "@/components/source-doc-link";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { PayrollEntry } from "@/types/entities";

export default function PayrollPage() {
  const [entries, setEntries] = React.useState<PayrollEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/payroll")
      .then((r) => r.json())
      .then((d) => setEntries(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper
      title="Payroll"
      description="Payroll runs and pay stubs"
      action={
        <Link href="/payroll/new">
          <Button>New Payroll Run</Button>
        </Link>
      }
    >
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payroll #</TableHead>
              <TableHead>Period End</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Gross Pay</TableHead>
              <TableHead>Net Pay</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pay Stub</TableHead>
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
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">No payroll runs yet.</TableCell>
              </TableRow>
            ) : (
              entries.map((e) => (
                <TableRow key={e.Payroll_ID}>
                  <TableCell>
                    <Link href={`/payroll/${e.Payroll_ID}`} className="font-medium text-blue-600 hover:underline">
                      {e.Payroll_ID}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(e.Pay_Period_End)}</TableCell>
                  <TableCell>{e.Employee_Name}</TableCell>
                  <TableCell>{formatCurrency(e.Gross_Pay)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(e.Net_Pay)}</TableCell>
                  <TableCell><StatusBadge status={e.Status} /></TableCell>
                  <TableCell><span className="text-xs text-gray-400">—</span></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
