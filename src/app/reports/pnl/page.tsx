"use client";

import * as React from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { ReportFilters, type ReportFilterValues } from "@/components/report-filters";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { today } from "@/lib/utils/date";
import type { PnLReport } from "@/types/api";

function defaultFilters(): ReportFilterValues {
  const t = today();
  const firstOfMonth = t.slice(0, 7) + "-01";
  return { dateFrom: firstOfMonth, dateTo: t, dimensions: {} };
}

export default function PnLPage() {
  const [filters, setFilters] = React.useState<ReportFilterValues>(defaultFilters);
  const [report, setReport] = React.useState<PnLReport | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      ...filters.dimensions,
    });
    try {
      const res = await fetch(`/api/reports/pnl?${params}`);
      const data = await res.json();
      setReport(data.data ?? null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <PageWrapper title="Profit & Loss" description="Revenue, expenses, and net income">
      <ReportFilters value={filters} onChange={setFilters} onApply={load} loading={loading} />

      {report && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Revenue</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{formatCurrency(report.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Expenses</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{formatCurrency(report.totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Net Income</p>
              <p className={`mt-2 text-3xl font-bold ${report.netIncome >= 0 ? "text-blue-700" : "text-red-700"}`}>
                {formatCurrency(report.netIncome)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {report && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Revenue Breakdown */}
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Revenue</h3>
              <div className="divide-y divide-gray-100">
                {report.revenue.map((line) => (
                  <div key={line.account} className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">
                      <span className="font-mono text-xs text-gray-400">{line.account}</span>{" "}
                      {line.name}
                    </span>
                    <span className="font-medium">{formatCurrency(line.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Expenses</h3>
              <div className="divide-y divide-gray-100">
                {report.expenses.map((line) => (
                  <div key={line.account} className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">
                      <span className="font-mono text-xs text-gray-400">{line.account}</span>{" "}
                      {line.name}
                    </span>
                    <span className="font-medium">{formatCurrency(line.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}
