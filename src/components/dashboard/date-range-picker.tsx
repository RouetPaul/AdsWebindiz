"use client";

import { cn } from "@/lib/utils";

export type DateRange = "1" | "7" | "14" | "30" | "custom";

const OPTIONS: { value: DateRange; label: string }[] = [
  { value: "1", label: "Aujourd'hui" },
  { value: "7", label: "7 jours" },
  { value: "14", label: "14 jours" },
  { value: "30", label: "30 jours" },
];

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-white/10 text-white"
              : "text-zinc-400 hover:text-white",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
