"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/utils/currency";

interface KpiCard {
  label: string;
  value: string;
  sub: string;
  href: string;
  color: string;
}

interface RecentItem {
  id: string;
  type: string;
  description: string;
  amount: number;
  status: string;
  href: string;
}

export default function DashboardPage() {
  const [kpis, setKpis] = React.useState<KpiCard[]>([]);
  const [recent, setRecent] = React.useState<RecentItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const [invRes, purRes, dailyRes] = await Promise.all([
          fetch("/api/invoices?limit=5").then((r) => r.json()),
          fetch("/api/purchases?limit=5").then((r) => r.json()),
          fetch("/api/reports/daily").then((r) => r.json()),
        ]);

        const invoices = invRes.data ?? [];
        const purchases = purRes.data ?? [];
        const daily = dailyRes.data ?? {};

        setKpis([
          {
            label: "Revenue (MTD)",
            value: formatCurrency(daily.revenue_mtd ?? 0),
            sub: "Month to date",
            href: "/reports/pnl",
            color: "text-green-600",
          },
          {
            label: "Outstanding AR",
            value: formatCurrency(daily.ar_balance ?? 0),
            sub: `${daily.ar_count ?? 0} open invoices`,
            href: "/reports/aging?type=ar",
            color: "text-blue-600",
          },
          {
            label: "Outstanding AP",
            value: formatCurrency(daily.ap_balance ?? 0),
            sub: `${daily.ap_count ?? 0} bills pending`,
            href: "/reports/aging?type=ap",
            color: "text-amber-600",
          },
          {
            label: "Cash Balance",
            value: formatCurrency(daily.cash_balance ?? 0),
            sub: "All bank accounts",
            href: "/bank",
            color: "text-gray-700",
          },
        ]);

        const recentItems: RecentItem[] = [
          ...invoices.slice(0, 3).map((inv: { Invoice_ID: string; Client_Name: string; Invoice_Total: number; Status: string }) => ({
            id: inv.Invoice_ID,
            type: "Invoice",
            description: inv.Client_Name,
            amount: inv.Invoice_Total,
            status: inv.Status,
            href: `/invoices/${inv.Invoice_ID}`,
          })),
          ...purchases.slice(0, 2).map((p: { Purchase_ID: string; Vendor_Name: string; Total_Amount: number; Status: string }) => ({
            id: p.Purchase_ID,
            type: "Purchase",
            description: p.Vendor_Name,
            amount: p.Total_Amount,
            status: p.Status,
            href: `/purchases/${p.Purchase_ID}`,
          })),
        ];
        setRecent(recentItems);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <PageWrapper title="Dashboard" description="Welcome to SoulLogic AI Accountant">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                  <div className="mt-3 h-8 w-32 animate-pulse rounded bg-gray-100" />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => (
              <Link key={kpi.label} href={kpi.href}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-6">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {kpi.label}
                    </p>
                    <p className={`mt-2 text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    <p className="mt-1 text-xs text-gray-400">{kpi.sub}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "New Invoice", href: "/invoices/new" },
            { label: "New Purchase", href: "/purchases/new" },
            { label: "Record Payment", href: "/payments/new" },
            { label: "New Payroll Run", href: "/payroll/new" },
            { label: "P&L Report", href: "/reports/pnl" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-gray-400">No recent activity.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recent.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between py-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-6 items-center rounded bg-gray-100 px-2 text-xs font-medium text-gray-600">
                      {item.type}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.id}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.amount)}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
