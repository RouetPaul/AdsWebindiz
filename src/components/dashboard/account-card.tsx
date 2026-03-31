import Link from "next/link";
import { formatMoney, formatNumber, accountStatusLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Sparkline } from "@/components/ui/sparkline";

interface AccountCardProps {
  metaId: string;
  accountId: string;
  name: string;
  status: number;
  currency: string;
  spend: number;
  activeCampaigns: number;
  spendTrend: number[];
  change?: number;
}

export function AccountCard({
  accountId,
  name,
  status,
  currency,
  spend,
  activeCampaigns,
  spendTrend,
  change,
}: AccountCardProps) {
  const statusLabel = accountStatusLabel(status);

  return (
    <Link
      href={`/accounts/${accountId}`}
      className="group flex flex-col gap-4 rounded-xl border border-white/10 bg-zinc-900/50 p-5 transition-colors hover:border-white/20 hover:bg-zinc-900"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors">
            {name}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">ID: {accountId}</p>
        </div>
        <StatusBadge status={statusLabel} />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-zinc-500">Dépenses</p>
          <p className="text-lg font-semibold text-white">
            {formatMoney(spend * 100, currency)}
          </p>
          {change !== undefined && (
            <p
              className={`text-xs font-medium ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(1)}%
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Campagnes actives</p>
          <p className="text-lg font-semibold text-white">{formatNumber(activeCampaigns)}</p>
        </div>
      </div>

      {spendTrend.length > 1 && (
        <Sparkline data={spendTrend} className="h-8 w-full" />
      )}
    </Link>
  );
}
