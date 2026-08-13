"use client";

import * as React from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/utils/currency";
import type { Item } from "@/types/entities";

export default function ItemsPage() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((d) => setItems(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper
      title="Items"
      description="Products and services catalogue"
      action={
        <Link href="/items/new">
          <Button>New Item</Button>
        </Link>
      }
    >
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>GL Account</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-gray-100" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">No items yet.</TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.Item_ID}>
                  <TableCell>
                    <Link href={`/items/${item.Item_ID}`} className="font-medium text-blue-600 hover:underline">
                      {item.Item_ID}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{item.Item_Name}</TableCell>
                  <TableCell>{formatCurrency(item.Unit_Price)}</TableCell>
                  <TableCell>{formatCurrency(item.Cost_Price)}</TableCell>
                  <TableCell>{item.Account_Code}</TableCell>
                  <TableCell>{item.Unit}</TableCell>
                  <TableCell>
                    <span className={item.Is_Active ? "text-green-600" : "text-gray-400"}>
                      {item.Is_Active ? "Active" : "Inactive"}
                    </span>
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
