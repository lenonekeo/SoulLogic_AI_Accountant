"use client";

import * as React from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SourceDocLink } from "@/components/source-doc-link";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { SubledgerEntry } from "@/types/entities";

export default function SubledgerPage() {
  const [entries, setEntries] = React.useState<SubledgerEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/subledger")
      .then((r) => r.json())
      .then((d) => setEntries(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper title="Subledger" description="Transaction-level detail for all postings">
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SL ID</TableHead>
              <TableHead>Posting Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>GL ID</TableHead>
              <TableHead>Document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-gray-100" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">
                  No subledger entries yet.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e) => (
                <TableRow key={e.SL_ID}>
                  <TableCell className="font-mono text-xs">{e.SL_ID}</TableCell>
                  <TableCell className="text-xs">{formatDate(e.Posting_Date)}</TableCell>
                  <TableCell>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{e.Document_Type}</span>
                  </TableCell>
                  <TableCell className="text-sm">{e.Entity_Name}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(e.Amount)}</TableCell>
                  <TableCell>
                    {e.GL_ID ? (
                      <Link href={`/ledger/${e.GL_ID}`} className="font-mono text-xs text-blue-600 hover:underline">
                        {e.GL_ID}
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">Unposted</span>
                    )}
                  </TableCell>
                  <TableCell><SourceDocLink url={e.Source_Doc_URL} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
