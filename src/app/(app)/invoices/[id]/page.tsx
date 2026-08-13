"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { ApprovalCard } from "@/components/approval-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DimensionTags } from "@/components/dimension-tags";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { useToast } from "@/components/ui/toast";
import type { SalesInvoice } from "@/types/entities";
import { InvoiceStatus } from "@/types/enums";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const [invoice, setInvoice] = React.useState<SalesInvoice | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [approving, setApproving] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((r) => r.json())
      .then((d) => setInvoice(d.data ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  const approve = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/invoices/${id}/approve`, { method: "POST" });
      if (res.ok) {
        addToast({ message: "Invoice approved and posted to GL.", variant: "success" });
        router.refresh();
        const d = await fetch(`/api/invoices/${id}`).then((r) => r.json());
        setInvoice(d.data ?? null);
      } else {
        const err = await res.json();
        addToast({ message: err.error ?? "Approval failed.", variant: "error" });
      }
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Invoice">
        <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
      </PageWrapper>
    );
  }

  if (!invoice) {
    return (
      <PageWrapper title="Invoice">
        <p className="text-gray-500">Invoice not found.</p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={`Invoice ${invoice.Invoice_ID}`}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Line Items */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Line Items</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead>Dimensions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(typeof invoice.Line_Items === "string"
                  ? JSON.parse(invoice.Line_Items || "[]")
                  : []
                ).map((line: { Item_Name: string; Qty: number; Unit_Price: number; Amount: number }, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{line.Item_Name}</TableCell>
                    <TableCell className="text-right">{line.Qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.Unit_Price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(line.Amount)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className="mt-4 flex flex-col items-end gap-1 text-sm">
              <div className="flex gap-12">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(invoice.Subtotal)}</span>
              </div>
              {invoice.Tax_Amount > 0 && (
                <div className="flex gap-12">
                  <span className="text-gray-500">Tax</span>
                  <span>{formatCurrency(invoice.Tax_Amount)}</span>
                </div>
              )}
              <div className="flex gap-12 border-t pt-2 font-semibold">
                <span>Total</span>
                <span className="text-blue-700">{formatCurrency(invoice.Total_Amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <ApprovalCard
            title="Invoice Details"
            id={invoice.Invoice_ID}
            status={invoice.Status}
            sourceDocUrl={invoice.PDF_URL}
            details={[
              { label: "Client", value: invoice.Client_Name },
              { label: "Invoice Date", value: formatDate(invoice.Invoice_Date) },
              { label: "Due Date", value: formatDate(invoice.Due_Date) },
              { label: "Total", value: formatCurrency(invoice.Total_Amount) },
              { label: "Balance Due", value: formatCurrency(invoice.Balance_Due) },
              { label: "GL Posted", value: invoice.GL_Posted ? "Yes" : "No" },
            ]}
            onApprove={invoice.Status === InvoiceStatus.Draft || invoice.Status === InvoiceStatus.Sent ? approve : undefined}
            loading={approving}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
