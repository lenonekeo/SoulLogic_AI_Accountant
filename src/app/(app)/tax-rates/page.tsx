"use client";

import * as React from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TaxRate } from "@/types/entities";

export default function TaxRatesPage() {
  const [rates, setRates] = React.useState<TaxRate[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/tax-rates")
      .then((r) => r.json())
      .then((d) => setRates(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper title="Tax Rates" description="GST, QST, HST, PST by province">
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Province</TableHead>
              <TableHead>Rate %</TableHead>
              <TableHead>GL Account</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-gray-100" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : rates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">No tax rates configured.</TableCell>
              </TableRow>
            ) : (
              rates.map((r) => (
                <TableRow key={r.Tax_Code}>
                  <TableCell className="font-mono font-semibold">{r.Tax_Code}</TableCell>
                  <TableCell>{r.Tax_Name}</TableCell>
                  <TableCell>{r.Province}</TableCell>
                  <TableCell className="font-medium">{Number(r.Rate).toFixed(3)}%</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{r.GL_Account_Code}</TableCell>
                  <TableCell className="text-xs">{r.Effective_Date}</TableCell>
                  <TableCell>{r.Is_Active ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
