"use client";

import * as React from "react";
import Fuse from "fuse.js";
import { cn } from "@/lib/utils/cn";

interface EntityOption {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface EntitySelectorProps {
  options: EntityOption[];
  value: string;
  onChange: (id: string, entity: EntityOption | null) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function EntitySelector({
  options,
  value,
  onChange,
  placeholder = "Search...",
  label,
  error,
  disabled,
  className,
}: EntitySelectorProps) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync display value when value prop changes
  const selectedEntity = options.find((o) => o.id === value);
  const displayValue = selectedEntity ? selectedEntity.name : query;

  const fuse = React.useMemo(
    () => new Fuse(options, { keys: ["name", "id"], threshold: 0.4, includeScore: true }),
    [options]
  );

  const filtered = React.useMemo(() => {
    if (!query) return options.slice(0, 10);
    return fuse.search(query, { limit: 10 }).map((r) => r.item);
  }, [query, fuse, options]);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (entity: EntityOption) => {
    onChange(entity.id, entity);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    onChange("", null);
    setQuery("");
  };

  return (
    <div className={cn("flex flex-col gap-1", className)} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          value={selectedEntity ? selectedEntity.name : query}
          onChange={(e) => {
            if (selectedEntity) {
              handleClear();
            }
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(
            "flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 pr-8 text-sm shadow-sm transition-colors",
            "placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        {selectedEntity && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {open && !disabled && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">No results</p>
            ) : (
              filtered.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => handleSelect(entity)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{entity.name}</span>
                  <span className="text-xs text-gray-400">{entity.id}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
