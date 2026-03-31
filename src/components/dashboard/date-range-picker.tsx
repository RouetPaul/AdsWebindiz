"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type DateRange = "1" | "7" | "14" | "30";

const OPTIONS: { value: DateRange; label: string }[] = [
  { value: "1", label: "Aujourd'hui" },
  { value: "7", label: "7 jours" },
  { value: "14", label: "14 jours" },
  { value: "30", label: "30 jours" },
];

interface DateRangePickerProps {
  value: DateRange;
}

export function DateRangePicker({ value }: DateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(range: DateRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("days", range);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleChange(opt.value)}
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
