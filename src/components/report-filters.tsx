"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DimensionSlot {
  code: string;
  label: string;
  values: Array<{ code: string; description: string }>;
}

export interface ReportFilterValues {
  dateFrom: string;
  dateTo: string;
  dimensions: Record<string, string>;
}

interface ReportFiltersProps {
  slots?: DimensionSlot[];
  value: ReportFilterValues;
  onChange: (filters: ReportFilterValues) => void;
  onApply: () => void;
  loading?: boolean;
}

export function ReportFilters({
  slots = [],
  value,
  onChange,
  onApply,
  loading,
}: ReportFiltersProps) {
  const setDate = (key: "dateFrom" | "dateTo", v: string) =>
    onChange({ ...value, [key]: v });

  const setDimension = (code: string, v: string) =>
    onChange({ ...value, dimensions: { ...value.dimensions, [code]: v } });

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="From"
          type="date"
          value={value.dateFrom}
          onChange={(e) => setDate("dateFrom", e.target.value)}
          className="w-36"
        />
        <Input
          label="To"
          type="date"
          value={value.dateTo}
          onChange={(e) => setDate("dateTo", e.target.value)}
          className="w-36"
        />

        {slots.map((slot) => (
          <div key={slot.code} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">{slot.label}</label>
            <select
              value={value.dimensions[slot.code] ?? ""}
              onChange={(e) => setDimension(slot.code, e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {slot.values.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.code} — {v.description}
                </option>
              ))}
            </select>
          </div>
        ))}

        <Button onClick={onApply} loading={loading} disabled={loading} className="self-end">
          Apply
        </Button>
      </div>
    </div>
  );
}
