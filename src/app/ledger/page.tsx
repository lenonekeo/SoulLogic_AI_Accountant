"use client";

import * as React from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DimensionTags } from "@/components/dimension-tags";
import { SourceDocLink } from "@/components/source-doc-link";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { GLEntry } from "@/types/entities";

export default function LedgerPage() {
  const [entries, setEntries] = React.useState<GLEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/ledger")
      .then((r) => r.json())
      .then((d) => setEntries(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper title="General Ledger" description="All posted journal entries">
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GL ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Debit</TableHead>
              <TableHead>Credit</TableHead>
              <TableHead>Dimensions</TableHead>
              <TableHead>Document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-gray-100" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-400">
                  No GL entries yet. Approve a document to post.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e) => (
                <TableRow key={e.GL_ID}>
                  <TableCell>
                    <Link href={`/ledger/${e.GL_ID}`} className="font-mono text-xs text-blue-600 hover:underline">
                      {e.GL_ID}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(e.Date)}</TableCell>
                  <TableCell className="font-mono text-xs">{e.Account_Code}</TableCell>
                  <TableCell className="max-w-48 truncate text-sm">{e.Description}</TableCell>
                  <TableCell className="text-right font-medium text-green-700">
                    {e.Debit ? formatCurrency(e.Debit) : ""}
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-700">
                    {e.Credit ? formatCurrency(e.Credit) : ""}
                  </TableCell>
                  <TableCell>
                    <DimensionTags dimensions={e} />
                  </TableCell>
                  <TableCell>
                    <SourceDocLink url={e.Source_Doc_URL} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
