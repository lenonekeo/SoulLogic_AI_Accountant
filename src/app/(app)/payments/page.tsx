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
import type { Payment } from "@/types/entities";

export default function PaymentsPage() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then((d) => setPayments(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper
      title="Payments"
      description="Vendor payment batches"
      action={
        <Link href="/payments/new">
          <Button>New Payment Batch</Button>
        </Link>
      }
    >
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Document</TableHead>
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
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">No payments yet.</TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p.Payment_ID}>
                  <TableCell>
                    <Link href={`/payments/${p.Payment_ID}`} className="font-medium text-blue-600 hover:underline">
                      {p.Payment_ID}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(p.Payment_Date)}</TableCell>
                  <TableCell>{p.Vendor_Name}</TableCell>
                  <TableCell>{p.Payment_Method}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(p.Amount)}</TableCell>
                  <TableCell><StatusBadge status={p.Status} /></TableCell>
                  <TableCell><SourceDocLink url={p.Source_Doc_URL} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
