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
import type { PurchaseInvoice } from "@/types/entities";

export default function PurchasesPage() {
  const [purchases, setPurchases] = React.useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/purchases")
      .then((r) => r.json())
      .then((d) => setPurchases(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper
      title="Purchases"
      description="Vendor bills and accounts payable"
      action={
        <Link href="/purchases/new">
          <Button>New Purchase</Button>
        </Link>
      }
    >
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Purchase #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
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
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-gray-100" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">
                  No purchases yet.
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((p) => (
                <TableRow key={p.PurchInv_ID}>
                  <TableCell>
                    <Link href={`/purchases/${p.PurchInv_ID}`} className="font-medium text-blue-600 hover:underline">
                      {p.PurchInv_ID}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(p.Invoice_Date)}</TableCell>
                  <TableCell>{p.Vendor_Name}</TableCell>
                  <TableCell>{formatDate(p.Due_Date)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(p.Total_Amount)}</TableCell>
                  <TableCell><StatusBadge status={p.Status} /></TableCell>
                  <TableCell><SourceDocLink url={p.PDF_URL} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
