"use client";

import * as React from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/utils/currency";
import type { BankAccount } from "@/types/entities";

export default function BankPage() {
  const [accounts, setAccounts] = React.useState<BankAccount[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/bank")
      .then((r) => r.json())
      .then((d) => setAccounts(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper
      title="Bank Accounts"
      description="Bank accounts and reconciliation"
      action={
        <div className="flex gap-2">
          <Link href="/bank/upload">
            <Button variant="outline">Upload Statement</Button>
          </Link>
          <Link href="/bank/new">
            <Button>Add Account</Button>
          </Link>
        </div>
      }
    >
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>GL Account</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-gray-100" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">No bank accounts yet.</TableCell>
              </TableRow>
            ) : (
              accounts.map((acc) => (
                <TableRow key={acc.Bank_ID}>
                  <TableCell>
                    <Link href={`/bank/${acc.Bank_ID}`} className="font-medium text-blue-600 hover:underline">
                      {acc.Bank_ID}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{acc.Account_Name}</TableCell>
                  <TableCell>{acc.Bank_Name}</TableCell>
                  <TableCell>{"••••" + acc.Account_Number_Last4}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(acc.Current_Balance)}</TableCell>
                  <TableCell>{acc.GL_Account_Code}</TableCell>
                  <TableCell><StatusBadge status={acc.Status} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
