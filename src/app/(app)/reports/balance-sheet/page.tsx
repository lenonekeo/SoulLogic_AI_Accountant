"use client";

import * as React from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/currency";
import { today } from "@/lib/utils/date";
import type { BalanceSheetReport } from "@/types/api";

export default function BalanceSheetPage() {
  const [asOf, setAsOf] = React.useState(today());
  const [report, setReport] = React.useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/balance-sheet?as_of=${asOf}`);
      const data = await res.json();
      setReport(data.data ?? null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageWrapper title="Balance Sheet" description="Financial position at a point in time">
      <div className="flex items-end gap-3">
        <Input label="As of Date" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-44" />
        <Button onClick={load} loading={loading} disabled={loading}>Refresh</Button>
      </div>

      {report && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Assets */}
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 text-base font-semibold text-gray-900">Assets</h3>
              <div className="divide-y divide-gray-100">
                {report.assets.map((line) => (
                  <div key={line.account} className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">
                      <span className="font-mono text-xs text-gray-400">{line.account}</span>{" "}
                      {line.name}
                    </span>
                    <span className="font-medium">{formatCurrency(line.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between border-t pt-3 font-semibold">
                <span>Total Assets</span>
                <span className="text-blue-700">{formatCurrency(report.totalAssets)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Liabilities + Equity */}
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 text-base font-semibold text-gray-900">Liabilities & Equity</h3>
              <p className="mb-2 text-xs font-medium uppercase text-gray-400">Liabilities</p>
              <div className="divide-y divide-gray-100">
                {report.liabilities.map((line) => (
                  <div key={line.account} className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">
                      <span className="font-mono text-xs text-gray-400">{line.account}</span>{" "}
                      {line.name}
                    </span>
                    <span className="font-medium">{formatCurrency(line.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between border-t pt-2 font-semibold text-sm">
                <span>Total Liabilities</span>
                <span>{formatCurrency(report.totalLiabilities)}</span>
              </div>

              <p className="mb-2 mt-6 text-xs font-medium uppercase text-gray-400">Equity</p>
              <div className="divide-y divide-gray-100">
                {report.equity.map((line) => (
                  <div key={line.account} className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">
                      <span className="font-mono text-xs text-gray-400">{line.account}</span>{" "}
                      {line.name}
                    </span>
                    <span className="font-medium">{formatCurrency(line.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between border-t pt-3 font-semibold">
                <span>Total Liabilities & Equity</span>
                <span className="text-blue-700">{formatCurrency(report.totalLiabilities + report.totalEquity)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}
