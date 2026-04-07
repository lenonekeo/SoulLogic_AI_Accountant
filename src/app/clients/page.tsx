"use client";

import * as React from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import type { Client } from "@/types/entities";

export default function ClientsPage() {
  const [clients, setClients] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => setClients(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper
      title="Clients"
      description="Customer records"
      action={
        <Link href="/clients/new">
          <Button>New Client</Button>
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
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">No clients yet.</TableCell>
              </TableRow>
            ) : (
              clients.map((c) => (
                <TableRow key={c.Client_ID}>
                  <TableCell>
                    <Link href={`/clients/${c.Client_ID}`} className="font-medium text-blue-600 hover:underline">
                      {c.Client_ID}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{c.Company_Name}</TableCell>
                  <TableCell>{c.Contact_Name}</TableCell>
                  <TableCell>{c.Email}</TableCell>
                  <TableCell>{c.Phone}</TableCell>
                  <TableCell>{c.Payment_Terms}</TableCell>
                  <TableCell><StatusBadge status={c.Status} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
