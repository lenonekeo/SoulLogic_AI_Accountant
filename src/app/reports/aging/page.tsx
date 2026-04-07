"use client";

import * as React from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/currency";
import type { AgingReport } from "@/types/api";

export default function AgingPage() {
  const [type, setType] = React.useState<"ar" | "ap">("ar");
  const [report, setReport] = React.useState<AgingReport | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/aging?type=${type}`);
      const data = await res.json();
      setReport(data.data ?? null);
    } finally {
      setLoading(false);
    }
  }, [type]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <PageWrapper
      title={type === "ar" ? "AR Aging" : "AP Aging"}
      description="Outstanding balances by age bucket"
    >
      {/* Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setType("ar")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            type === "ar" ? "bg-blue-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Accounts Receivable
        </button>
        <button
          onClick={() => setType("ap")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            type === "ap" ? "bg-blue-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Accounts Payable
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{type === "ar" ? "Client" : "Vendor"}</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">1–30</TableHead>
              <TableHead className="text-right">31–60</TableHead>
              <TableHead className="text-right">61–90</TableHead>
              <TableHead className="text-right">90+</TableHead>
              <TableHead className="text-right">Total</TableHead>
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
            ) : !report || report.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">
                  No outstanding {type === "ar" ? "receivables" : "payables"}.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {report.rows.map((row) => (
                  <TableRow key={row.entity}>
                    <TableCell className="font-medium">{row.entity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.current)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.days30)}</TableCell>
                    <TableCell className="text-right text-amber-600">{formatCurrency(row.days60)}</TableCell>
                    <TableCell className="text-right text-orange-600">{formatCurrency(row.days90)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(row.over90)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(row.total)}</TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{formatCurrency(report.totals.current)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(report.totals.days30)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(report.totals.days60)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(report.totals.days90)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(report.totals.over90)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(report.totals.total)}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
