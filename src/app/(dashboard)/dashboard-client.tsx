"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { MetricsSummary, type MetricsData } from "@/components/dashboard/metrics-summary";
import { DateRangePicker, type DateRange } from "@/components/dashboard/date-range-picker";
import { AccountCard } from "@/components/dashboard/account-card";

interface AccountData {
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

interface DashboardData {
  metrics: MetricsData;
  accounts: AccountData[];
  lastSyncedAt: string | null;
}

export function DashboardClient({
  initialData,
  dateRange,
}: {
  initialData: DashboardData;
  dateRange: DateRange;
}) {
  return (
    <div className="flex flex-col">
      <Header title="Dashboard" lastSyncedAt={initialData.lastSyncedAt} />

      <div className="space-y-6 p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Vue d&apos;ensemble</h2>
          <Suspense>
            <DateRangePicker value={dateRange} />
          </Suspense>
        </div>

        <MetricsSummary data={initialData.metrics} />

        <div>
          <h2 className="mb-4 text-lg font-medium text-white">Ad Accounts</h2>
          {initialData.accounts.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-12 text-center">
              <p className="text-zinc-400">Aucun compte synchronisé.</p>
              <p className="mt-1 text-sm text-zinc-500">
                Lancez une sync manuelle pour charger vos comptes Meta.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {initialData.accounts.map((acc) => (
                <AccountCard key={acc.metaId} {...acc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
