"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentTerms } from "@/types/enums";

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      Company_Name: fd.get("Company_Name"),
      Contact_Name: fd.get("Contact_Name") || undefined,
      Email: fd.get("Email") || undefined,
      Phone: fd.get("Phone") || undefined,
      Address: fd.get("Address") || undefined,
      Tax_ID: fd.get("Tax_ID") || undefined,
      Payment_Terms: fd.get("Payment_Terms"),
      Notes: fd.get("Notes") || undefined,
    };
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create client");
      router.push("/clients");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper title="New Client" description="Add a new customer record">
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Company Name <span className="text-red-500">*</span></label>
              <Input name="Company_Name" required placeholder="Acme Corp" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Contact Name</label>
              <Input name="Contact_Name" placeholder="John Smith" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <Input name="Email" type="email" placeholder="john@acme.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <Input name="Phone" placeholder="514-555-0100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tax ID (GST/HST)</label>
              <Input name="Tax_ID" placeholder="123456789 RT0001" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
              <Input name="Address" placeholder="123 Main St, Montreal, QC" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Payment Terms <span className="text-red-500">*</span></label>
              <select name="Payment_Terms" required className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.values(PaymentTerms).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
              <textarea name="Notes" rows={3} placeholder="Internal notes..." className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push("/clients")}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Client"}</Button>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
}
