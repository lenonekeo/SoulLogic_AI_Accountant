"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LineItemEditor } from "@/components/line-item-editor";
import { EntitySelector } from "@/components/entity-selector";
import { useToast } from "@/components/ui/toast";
import { today, addPaymentTermsDays } from "@/lib/utils/date";
import type { LineItem } from "@/types/entities";
import { PaymentTerms, Province } from "@/types/enums";

export default function NewInvoicePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [clients, setClients] = React.useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState({
    client_id: "",
    client_name: "",
    invoice_date: today(),
    due_date: addPaymentTermsDays(today(), PaymentTerms.Net30),
    payment_terms: PaymentTerms.Net30,
    currency: "CAD",
    province: Province.QC,
    notes: "",
  });
  const [lineItems, setLineItems] = React.useState<LineItem[]>([]);

  React.useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) =>
        setClients(
          (d.data ?? []).map((c: { Client_ID: string; Company_Name: string }) => ({
            id: c.Client_ID,
            name: c.Company_Name,
          }))
        )
      );
  }, []);

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async () => {
    if (!form.client_id) {
      addToast({ message: "Please select a client.", variant: "warning" });
      return;
    }
    if (lineItems.length === 0) {
      addToast({ message: "Please add at least one line item.", variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, line_items: lineItems }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast({ message: `Invoice ${data.data.Invoice_ID} created.`, variant: "success" });
        router.push(`/invoices/${data.data.Invoice_ID}`);
      } else {
        addToast({ message: data.error ?? "Failed to create invoice.", variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper
      title="New Invoice"
      description="Create a sales invoice"
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={saving}>Save Invoice</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Client + Dates */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Invoice Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <EntitySelector
                  label="Client"
                  options={clients}
                  value={form.client_id}
                  onChange={(id, entity) =>
                    setForm((prev) => ({ ...prev, client_id: id, client_name: entity?.name ?? "" }))
                  }
                  placeholder="Search clients..."
                />
              </div>
              <Input
                label="Invoice Date"
                type="date"
                value={form.invoice_date}
                onChange={(e) => set("invoice_date", e.target.value)}
              />
              <Input
                label="Due Date"
                type="date"
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
              />
              <Select
                label="Payment Terms"
                value={form.payment_terms}
                onChange={(e) => set("payment_terms", e.target.value)}
                options={Object.values(PaymentTerms).map((v) => ({ value: v, label: v }))}
              />
              <Select
                label="Province"
                value={form.province}
                onChange={(e) => set("province", e.target.value)}
                options={Object.values(Province).map((v) => ({ value: v, label: v }))}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Line Items</h3>
            <LineItemEditor items={lineItems} onChange={setLineItems} />
          </div>

          {/* Notes */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Optional notes for the client..."
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 self-start">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Summary</h3>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Client</dt>
              <dd className="font-medium">{form.client_name || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Lines</dt>
              <dd>{lineItems.length}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <dt>Subtotal</dt>
              <dd>
                {lineItems.reduce((s, l) => s + (l.Amount ?? 0), 0).toLocaleString("en-CA", {
                  style: "currency",
                  currency: "CAD",
                })}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </PageWrapper>
  );
}
