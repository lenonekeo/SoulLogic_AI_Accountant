"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DimensionPicker } from "@/components/dimension-picker";
import { formatCurrency } from "@/lib/utils/currency";
import type { LineItem, DimensionFields } from "@/types/entities";

interface DimensionSlot {
  code: string;
  label: string;
  values: Array<{ code: string; description: string }>;
}

interface LineItemEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  dimensionSlots?: DimensionSlot[];
  disabled?: boolean;
}

const emptyLine = (): LineItem => ({
  Item_ID: "",
  Item_Name: "",
  Description: "",
  Qty: 1,
  Unit_Price: 0,
  Amount: 0,
  Tax_Code: "",
  Tax_Amount: 0,
});

function calcLine(line: LineItem): LineItem {
  const amount = line.Unit_Price * line.Qty;
  return { ...line, Amount: amount };
}

export function LineItemEditor({
  items,
  onChange,
  dimensionSlots = [],
  disabled,
}: LineItemEditorProps) {
  const [expandedRow, setExpandedRow] = React.useState<number | null>(null);

  const addLine = () => {
    onChange([...items, calcLine({ ...emptyLine() })]);
  };

  const removeLine = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, updates: Partial<LineItem>) => {
    const updated = items.map((line, i) => {
      if (i !== index) return line;
      return calcLine({ ...line, ...updates });
    });
    onChange(updated);
  };

  const updateDimensions = (index: number, dims: Partial<DimensionFields>) => {
    const updated = items.map((line, i) =>
      i === index ? { ...line, ...dims } : line
    );
    onChange(updated);
  };

  const total = items.reduce((sum, l) => sum + (l.Amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <span className="col-span-5">Description</span>
        <span className="col-span-2">Qty</span>
        <span className="col-span-3">Unit Price</span>
        <span className="col-span-1 text-right">Total</span>
        <span className="col-span-1" />
      </div>

      {/* Rows */}
      {items.map((line, i) => (
        <div key={i} className="rounded-md border border-gray-100 bg-gray-50">
          <div className="grid grid-cols-12 items-center gap-2 p-2">
            <div className="col-span-5">
              <Input
                value={line.Description ?? line.Item_Name}
                onChange={(e) => updateLine(i, { Item_Name: e.target.value, Description: e.target.value })}
                placeholder="Item description"
                disabled={disabled}
                className="h-8 text-xs"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={line.Qty}
                onChange={(e) => updateLine(i, { Qty: parseFloat(e.target.value) || 0 })}
                disabled={disabled}
                className="h-8 text-xs"
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={line.Unit_Price}
                onChange={(e) => updateLine(i, { Unit_Price: parseFloat(e.target.value) || 0 })}
                disabled={disabled}
                className="h-8 text-xs"
              />
            </div>
            <div className="col-span-1 text-right text-xs font-medium text-gray-700">
              {formatCurrency(line.Amount ?? 0)}
            </div>
            <div className="col-span-1 flex justify-end gap-1">
              {dimensionSlots.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                  title="Edit dimensions"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </button>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Remove line"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Dimension expansion */}
          {expandedRow === i && dimensionSlots.length > 0 && (
            <div className="border-t border-gray-100 p-3">
              <p className="mb-2 text-xs font-medium text-gray-500">Dimensions</p>
              <DimensionPicker
                slots={dimensionSlots}
                value={line as Partial<DimensionFields>}
                onChange={(dims) => updateDimensions(i, dims)}
                disabled={disabled}
              />
            </div>
          )}
        </div>
      ))}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        {!disabled && (
          <Button type="button" onClick={addLine} variant="outline" size="sm">
            + Add Line
          </Button>
        )}
        <div className="ml-auto text-sm font-semibold text-gray-900">
          Subtotal: {formatCurrency(total)}
        </div>
      </div>
    </div>
  );
}
