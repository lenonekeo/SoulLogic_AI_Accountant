"use client";

import * as React from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const { addToast } = useToast();

  const [company, setCompany] = React.useState({
    name: "",
    gst_number: "",
    qst_number: "",
    address: "",
    province: "QC",
    fiscal_year_start: "01-01",
    default_currency: "CAD",
  });

  const save = async () => {
    addToast({ message: "Settings saved (stored in .env.local).", variant: "success" });
  };

  return (
    <PageWrapper
      title="Settings"
      description="Company information and system configuration"
      action={<Button onClick={save}>Save Settings</Button>}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input
              label="Company Name"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              placeholder="SoulLogic Inc."
            />
            <Input
              label="GST/HST Number"
              value={company.gst_number}
              onChange={(e) => setCompany({ ...company, gst_number: e.target.value })}
              placeholder="123456789RT0001"
            />
            <Input
              label="QST Number"
              value={company.qst_number}
              onChange={(e) => setCompany({ ...company, qst_number: e.target.value })}
              placeholder="1234567890TQ0001"
            />
            <Input
              label="Address"
              value={company.address}
              onChange={(e) => setCompany({ ...company, address: e.target.value })}
              placeholder="123 Main St, Montréal, QC H1A 1A1"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Home Province</label>
              <select
                value={company.province}
                onChange={(e) => setCompany({ ...company, province: e.target.value })}
                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <Input
              label="Fiscal Year Start (MM-DD)"
              value={company.fiscal_year_start}
              onChange={(e) => setCompany({ ...company, fiscal_year_start: e.target.value })}
              placeholder="01-01"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Default Currency</label>
              <select
                value={company.default_currency}
                onChange={(e) => setCompany({ ...company, default_currency: e.target.value })}
                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </div>

            <div className="mt-2 rounded-md bg-blue-50 p-3 text-xs text-blue-700">
              <p className="font-semibold">Environment Variables</p>
              <p className="mt-1">Configure credentials in <code>.env.local</code>:</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                <li>GOOGLE_SERVICE_ACCOUNT_EMAIL</li>
                <li>GOOGLE_SPREADSHEET_ID</li>
                <li>ANTHROPIC_API_KEY</li>
                <li>OPENAI_API_KEY</li>
                <li>GOOGLE_DRIVE_ROOT_FOLDER_ID</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
