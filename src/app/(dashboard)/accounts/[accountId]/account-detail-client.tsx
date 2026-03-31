"use client";

import { useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { MetricsSummary, type MetricsData } from "@/components/dashboard/metrics-summary";
import { DateRangePicker, type DateRange } from "@/components/dashboard/date-range-picker";
import { CampaignTable, type CampaignRow } from "@/components/dashboard/campaign-table";

interface AccountInfo {
  name: string;
  accountId: string;
  currency: string;
  lastSyncedAt: string | null;
}

interface AccountDetailClientProps {
  account: AccountInfo;
  metrics: MetricsData;
  campaigns: CampaignRow[];
  dateRange: DateRange;
}

export function AccountDetailClient({
  account,
  metrics,
  campaigns: initialCampaigns,
  dateRange,
}: AccountDetailClientProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [toast, setToast] = useState<string | null>(null);

  const handleToggleStatus = useCallback(
    async (id: string, type: "campaign" | "adset" | "ad", newStatus: string) => {
      try {
        const endpoint =
          type === "campaign"
            ? "/api/meta/campaigns"
            : type === "adset"
              ? "/api/meta/adsets"
              : "/api/meta/ads";

        const bodyKey =
          type === "campaign" ? "campaignId" : type === "adset" ? "adSetId" : "adId";

        const res = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [bodyKey]: id, status: newStatus }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Erreur");
        }

        // Update local state
        if (type === "campaign") {
          setCampaigns((prev) =>
            prev.map((c) => (c.metaId === id ? { ...c, status: newStatus } : c)),
          );
        }

        setToast(`${type === "campaign" ? "Campagne" : type === "adset" ? "Ad Set" : "Ad"} ${newStatus === "ACTIVE" ? "activé" : "mis en pause"}`);
        setTimeout(() => setToast(null), 3000);
      } catch (err) {
        setToast(err instanceof Error ? err.message : "Erreur");
        setTimeout(() => setToast(null), 3000);
      }
    },
    [],
  );

  return (
    <div className="flex flex-col">
      <Header title={account.name} lastSyncedAt={account.lastSyncedAt} />

      <div className="space-y-6 p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/" className="hover:text-white transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-white">{account.name}</span>
        </div>

        {/* Date range */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Performance</h2>
          <Suspense>
            <DateRangePicker value={dateRange} />
          </Suspense>
        </div>

        {/* Metrics */}
        <MetricsSummary data={metrics} />

        {/* Campaign table */}
        <div>
          <h2 className="mb-4 text-lg font-medium text-white">Campagnes</h2>
          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-12 text-center">
              <p className="text-zinc-400">Aucune campagne trouvée pour ce compte.</p>
            </div>
          ) : (
            <CampaignTable
              campaigns={campaigns}
              currency={account.currency}
              onToggleStatus={handleToggleStatus}
            />
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
