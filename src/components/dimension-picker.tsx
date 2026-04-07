"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import type { DimensionFields } from "@/types/entities";

interface DimensionSlot {
  code: string;
  label: string;
  values: Array<{ code: string; description: string }>;
}

interface DimensionPickerProps {
  slots: DimensionSlot[];
  value: Partial<DimensionFields>;
  onChange: (value: Partial<DimensionFields>) => void;
  disabled?: boolean;
}

const dimensionKeys = [
  "Dimension_1", "Dimension_2", "Dimension_3", "Dimension_4",
  "Dimension_5", "Dimension_6", "Dimension_7", "Dimension_8",
] as const;

export function DimensionPicker({ slots, value, onChange, disabled }: DimensionPickerProps) {
  const handleChange = (key: typeof dimensionKeys[number], val: string) => {
    onChange({ ...value, [key]: val || undefined });
  };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {slots.map((slot, i) => {
        const key = dimensionKeys[i];
        if (!key) return null;
        const currentValue = (value[key] as string) ?? "";

        return (
          <div key={slot.code} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">
              {slot.label || `D${i + 1}`}
            </label>
            {slot.values.length > 0 ? (
              <select
                disabled={disabled}
                value={currentValue}
                onChange={(e) => handleChange(key, e.target.value)}
                className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">—</option>
                {slot.values.map((v) => (
                  <option key={v.code} value={v.code}>
                    {v.code} — {v.description}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                disabled={disabled}
                value={currentValue}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder="—"
                className="h-8 text-xs"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
