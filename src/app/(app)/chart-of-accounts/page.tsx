"use client";

import * as React from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ChartOfAccount } from "@/types/entities";

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = React.useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/chart-of-accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const grouped = React.useMemo(() => {
    const map = new Map<string, ChartOfAccount[]>();
    for (const acc of accounts) {
      const type = acc.Account_Type;
      if (!map.has(type)) map.set(type, []);
      map.get(type)!.push(acc);
    }
    return map;
  }, [accounts]);

  return (
    <PageWrapper title="Chart of Accounts" description="General ledger account structure">
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Sub Category</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-gray-100" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400">
                  No accounts. Run <code>npm run seed:coa</code> to seed defaults.
                </TableCell>
              </TableRow>
            ) : (
              Array.from(grouped.entries()).map(([type, accs]) => (
                <React.Fragment key={type}>
                  <TableRow className="bg-gray-50">
                    <TableCell colSpan={6} className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {type}
                    </TableCell>
                  </TableRow>
                  {accs.map((acc) => (
                    <TableRow key={acc.Account_Code}>
                      <TableCell className="font-mono font-semibold">{acc.Account_Code}</TableCell>
                      <TableCell>{acc.Account_Name}</TableCell>
                      <TableCell className="text-xs text-gray-500">{acc.Account_Type}</TableCell>
                      <TableCell className="text-xs">{acc.Sub_Category}</TableCell>
                      <TableCell>
                        <span className={acc.Is_Active ? "text-green-600" : "text-gray-400"}>
                          {acc.Is_Active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
