import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  clickable?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PAUSED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  DELETED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  ARCHIVED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  DISABLED: "bg-red-500/15 text-red-400 border-red-500/30",
  ERROR: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function StatusBadge({ status, clickable }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.ERROR;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        style,
        clickable && "cursor-pointer transition-opacity hover:opacity-80",
      )}
    >
      <span
        className={cn(
          "mr-1.5 h-1.5 w-1.5 rounded-full",
          status === "ACTIVE" && "bg-emerald-400",
          status === "PAUSED" && "bg-amber-400",
          (status === "ERROR" || status === "DISABLED") && "bg-red-400",
          (status === "DELETED" || status === "ARCHIVED") && "bg-zinc-400",
        )}
      />
      {status}
    </span>
  );
}
