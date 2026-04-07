import { cn } from "@/lib/utils/cn";
import type { DimensionFields } from "@/types/entities";

const slotColors: string[] = [
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
];

interface DimensionTagsProps {
  dimensions: Partial<DimensionFields>;
  className?: string;
}

export function DimensionTags({ dimensions, className }: DimensionTagsProps) {
  const slots = [
    dimensions.Dimension_1,
    dimensions.Dimension_2,
    dimensions.Dimension_3,
    dimensions.Dimension_4,
    dimensions.Dimension_5,
    dimensions.Dimension_6,
    dimensions.Dimension_7,
    dimensions.Dimension_8,
  ];

  const filled = slots.map((v, i) => ({ value: v, index: i })).filter((s) => s.value);

  if (filled.length === 0) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {filled.map(({ value, index }) => (
        <span
          key={index}
          className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
            slotColors[index]
          )}
        >
          D{index + 1}: {value}
        </span>
      ))}
    </div>
  );
}
