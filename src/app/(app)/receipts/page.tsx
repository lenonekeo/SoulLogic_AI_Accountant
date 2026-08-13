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
import type { SalesReceipt } from "@/types/entities";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = React.useState<SalesReceipt[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/receipts")
      .then((r) => r.json())
      .then((d) => setReceipts(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper
      title="Receipts"
      description="Sales receipts and cash sales"
      action={
        <Link href="/receipts/new">
          <Button>New Receipt</Button>
        </Link>
      }
    >
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Payment Method</TableHead>
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
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-gray-100" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : receipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">No receipts yet.</TableCell>
              </TableRow>
            ) : (
              receipts.map((r) => (
                <TableRow key={r.Receipt_ID}>
                  <TableCell>
                    <Link href={`/receipts/${r.Receipt_ID}`} className="font-medium text-blue-600 hover:underline">
                      {r.Receipt_ID}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(r.Receipt_Date)}</TableCell>
                  <TableCell>{r.Client_Name}</TableCell>
                  <TableCell>{r.Payment_Method}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(r.Amount)}</TableCell>
                  <TableCell><StatusBadge status={r.Status} /></TableCell>
                  <TableCell><SourceDocLink url={r.Source_Doc_URL} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
