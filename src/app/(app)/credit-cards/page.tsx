"use client";

import * as React from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/utils/currency";
import type { CreditCard } from "@/types/entities";

export default function CreditCardsPage() {
  const [cards, setCards] = React.useState<CreditCard[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/credit-cards")
      .then((r) => r.json())
      .then((d) => setCards(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper
      title="Credit Cards"
      description="Corporate credit card accounts"
      action={
        <div className="flex gap-2">
          <Link href="/credit-cards/upload">
            <Button variant="outline">Upload Statement</Button>
          </Link>
          <Link href="/credit-cards/new">
            <Button>Add Card</Button>
          </Link>
        </div>
      }
    >
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Card #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Issuer</TableHead>
              <TableHead>Last 4</TableHead>
              <TableHead>Limit</TableHead>
              <TableHead>Balance</TableHead>
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
            ) : cards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">No credit cards yet.</TableCell>
              </TableRow>
            ) : (
              cards.map((card) => (
                <TableRow key={card.CC_ID}>
                  <TableCell>
                    <Link href={`/credit-cards/${card.CC_ID}`} className="font-medium text-blue-600 hover:underline">
                      {card.CC_ID}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{card.Card_Name}</TableCell>
                  <TableCell>{card.GL_Account_Code}</TableCell>
                  <TableCell>••••{card.Card_Number_Last4}</TableCell>
                  <TableCell>{formatCurrency(card.Credit_Limit)}</TableCell>
                  <TableCell className="font-semibold text-red-600">{formatCurrency(card.Current_Balance)}</TableCell>
                  <TableCell><StatusBadge status={card.Status} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
