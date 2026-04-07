import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const reports = [
  {
    title: "Profit & Loss",
    description: "Revenue, expenses, and net income by period and dimension",
    href: "/reports/pnl",
  },
  {
    title: "Balance Sheet",
    description: "Assets, liabilities, and equity at a point in time",
    href: "/reports/balance-sheet",
  },
  {
    title: "AR / AP Aging",
    description: "Outstanding receivables and payables by age bucket",
    href: "/reports/aging",
  },
  {
    title: "Project Profitability",
    description: "Revenue and cost breakdown by project (Dimension 2)",
    href: "/reports/project-profitability",
  },
  {
    title: "Department Comparison",
    description: "P&L comparison across departments (Dimension 1)",
    href: "/reports/department-comparison",
  },
  {
    title: "Cash Flow",
    description: "Operating, investing, and financing cash flows",
    href: "/reports/cashflow",
  },
];

export default function ReportsPage() {
  return (
    <PageWrapper title="Reports" description="Financial statements and analysis">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>{r.title}</CardTitle>
                <CardDescription>{r.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs font-medium text-blue-600">View Report →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </PageWrapper>
  );
}
