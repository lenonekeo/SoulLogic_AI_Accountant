"use client";

import * as React from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { Dimension } from "@/types/entities";

export default function DimensionsPage() {
  const { addToast } = useToast();
  const [dimensions, setDimensions] = React.useState<Dimension[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/dimensions")
      .then((r) => r.json())
      .then((d) => setDimensions(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const update = (index: number, field: keyof Dimension, value: string) => {
    setDimensions((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/dimensions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dimensions),
      });
      if (res.ok) {
        addToast({ message: "Dimensions saved.", variant: "success" });
      } else {
        addToast({ message: "Failed to save dimensions.", variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper
      title="Dimensions"
      description="Configure 8 analysis dimensions for reporting"
      action={
        <Button onClick={save} loading={saving} disabled={saving || loading}>
          Save Changes
        </Button>
      }
    >
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {dimensions.map((dim, i) => (
            <Card key={dim.Dimension_Code}>
              <CardHeader>
                <CardTitle className="text-sm">Dimension {i + 1}</CardTitle>
                <p className="text-xs text-gray-400">{dim.Dimension_Code}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Input
                  label="Name"
                  value={dim.Dimension_Name}
                  onChange={(e) => update(i, "Dimension_Name", e.target.value)}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Posting Rule</label>
                  <select
                    value={dim.Blocking_Rule ?? "Blank"}
                    onChange={(e) => update(i, "Blocking_Rule" as keyof Dimension, e.target.value)}
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Blank">Blank</option>
                    <option value="CodeMandatory">Code Mandatory</option>
                    <option value="SameCode">Same Code</option>
                    <option value="NoCode">No Code</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`active-${i}`}
                    checked={dim.Is_Active}
                    onChange={(e) => update(i, "Is_Active" as keyof Dimension, String(e.target.checked) as unknown as string)}
                    className="h-3.5 w-3.5"
                  />
                  <label htmlFor={`active-${i}`} className="text-xs text-gray-600">Active</label>
                </div>
                <Link href={`/dimensions/${dim.Dimension_Code}/values`} className="text-xs text-blue-600 hover:underline">
                  Manage Values →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
