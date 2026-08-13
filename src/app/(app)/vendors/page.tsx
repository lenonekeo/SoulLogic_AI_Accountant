"use client";

import * as React from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import type { Vendor } from "@/types/entities";

export default function VendorsPage() {
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/vendors")
      .then((r) => r.json())
      .then((d) => setVendors(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper
      title="Vendors"
      description="Supplier records"
      action={
        <Link href="/vendors/new">
          <Button>New Vendor</Button>
        </Link>
      }
    >
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead>Status</TableHead>
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
            ) : vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">No vendors yet.</TableCell>
              </TableRow>
            ) : (
              vendors.map((v) => (
                <TableRow key={v.Vendor_ID}>
                  <TableCell>
                    <Link href={`/vendors/${v.Vendor_ID}`} className="font-medium text-blue-600 hover:underline">
                      {v.Vendor_ID}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{v.Company_Name}</TableCell>
                  <TableCell>{v.Contact_Name}</TableCell>
                  <TableCell>{v.Email}</TableCell>
                  <TableCell>{v.Phone}</TableCell>
                  <TableCell>{v.Payment_Terms}</TableCell>
                  <TableCell><StatusBadge status={v.Status} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
