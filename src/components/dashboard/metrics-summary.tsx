import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  change?: number;
}

function MetricCard({ label, value, change }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {change !== undefined && (
        <p
          className={`mt-1 text-xs font-medium ${
            change >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}% vs période précédente
        </p>
      )}
    </div>
  );
}

export interface MetricsData {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  reach: number;
  currency?: string;
  // Previous period for comparison
  prevSpend?: number;
  prevImpressions?: number;
  prevClicks?: number;
  prevCtr?: number;
  prevCpc?: number;
}

function pctChange(current: number, previous?: number): number | undefined {
  if (previous === undefined || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

export function MetricsSummary({ data }: { data: MetricsData }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <MetricCard
        label="Dépenses"
        value={formatMoney(data.spend * 100, data.currency ?? "EUR")}
        change={pctChange(data.spend, data.prevSpend)}
      />
      <MetricCard
        label="Impressions"
        value={formatNumber(data.impressions)}
        change={pctChange(data.impressions, data.prevImpressions)}
      />
      <MetricCard
        label="Clics"
        value={formatNumber(data.clicks)}
        change={pctChange(data.clicks, data.prevClicks)}
      />
      <MetricCard
        label="CTR"
        value={formatPercent(data.ctr)}
        change={pctChange(data.ctr, data.prevCtr)}
      />
      <MetricCard
        label="CPC"
        value={formatMoney(data.cpc * 100, data.currency ?? "EUR")}
        change={pctChange(data.cpc, data.prevCpc)}
      />
      <MetricCard
        label="Reach"
        value={formatNumber(data.reach)}
      />
    </div>
  );
}
