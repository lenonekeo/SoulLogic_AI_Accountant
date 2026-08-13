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
import type { SalesInvoice } from "@/types/entities";

export default function InvoicesPage() {
  const [invoices, setInvoices] = React.useState<SalesInvoice[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((d) => setInvoices(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper
      title="Invoices"
      description="Sales invoices and receivables"
      action={
        <Link href="/invoices/new">
          <Button>New Invoice</Button>
        </Link>
      }
    >
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="h-4 animate-pulse rounded bg-gray-100" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">
                  No invoices yet.{" "}
                  <Link href="/invoices/new" className="text-blue-600 hover:underline">
                    Create one
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.Invoice_ID}>
                  <TableCell>
                    <Link href={`/invoices/${inv.Invoice_ID}`} className="font-medium text-blue-600 hover:underline">
                      {inv.Invoice_ID}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(inv.Invoice_Date)}</TableCell>
                  <TableCell>{inv.Client_Name}</TableCell>
                  <TableCell>{formatDate(inv.Due_Date)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(inv.Total_Amount)}</TableCell>
                  <TableCell><StatusBadge status={inv.Status} /></TableCell>
                  <TableCell><SourceDocLink url={inv.PDF_URL} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
