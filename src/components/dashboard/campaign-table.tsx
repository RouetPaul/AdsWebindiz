"use client";

import { useState } from "react";
import { formatMoney, formatNumber, formatPercent, cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Sparkline } from "@/components/ui/sparkline";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CampaignRow {
  metaId: string;
  name: string;
  status: string;
  objective: string | null;
  dailyBudget: number | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  spendTrend: number[];
  currency: string;
  adSets?: AdSetRow[];
}

export interface AdSetRow {
  metaId: string;
  name: string;
  status: string;
  dailyBudget: number | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  ads?: AdRow[];
}

export interface AdRow {
  metaId: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
}

interface CampaignTableProps {
  campaigns: CampaignRow[];
  currency: string;
  onToggleStatus: (id: string, type: "campaign" | "adset" | "ad", newStatus: string) => void;
}

type SortKey = "name" | "status" | "spend" | "impressions" | "clicks" | "ctr" | "cpc" | "conversions";

// ─── Component ───────────────────────────────────────────────────────────────

export function CampaignTable({ campaigns, currency, onToggleStatus }: CampaignTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [expandedAdSet, setExpandedAdSet] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const filtered = campaigns.filter(
    (c) => statusFilter === "ALL" || c.status === statusFilter,
  );

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey] ?? "";
    const vb = b[sortKey] ?? "";
    const cmp = typeof va === "number" ? va - (vb as number) : String(va).localeCompare(String(vb));
    return sortAsc ? cmp : -cmp;
  });

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="cursor-pointer px-4 py-3 text-left text-xs font-medium text-zinc-400 hover:text-white"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === field && <span>{sortAsc ? "\u2191" : "\u2193"}</span>}
      </span>
    </th>
  );

  return (
    <div>
      {/* Status filter */}
      <div className="mb-4 flex gap-2">
        {(["ALL", "ACTIVE", "PAUSED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === s
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:text-white",
            )}
          >
            {s === "ALL" ? "Tous" : s === "ACTIVE" ? "Actives" : "En pause"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full">
          <thead className="border-b border-white/10 bg-zinc-900/50">
            <tr>
              <th className="w-8 px-4 py-3" />
              <SortHeader label="Campagne" field="name" />
              <SortHeader label="Status" field="status" />
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Budget/j</th>
              <SortHeader label="Dépenses" field="spend" />
              <SortHeader label="Impressions" field="impressions" />
              <SortHeader label="Clics" field="clicks" />
              <SortHeader label="CTR" field="ctr" />
              <SortHeader label="CPC" field="cpc" />
              <SortHeader label="Conversions" field="conversions" />
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Tendance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((camp) => (
              <>
                {/* Campaign row */}
                <tr
                  key={camp.metaId}
                  className="cursor-pointer transition-colors hover:bg-white/5"
                  onClick={() =>
                    setExpandedCampaign(expandedCampaign === camp.metaId ? null : camp.metaId)
                  }
                >
                  <td className="px-4 py-3 text-zinc-500">
                    {expandedCampaign === camp.metaId ? "\u25BC" : "\u25B6"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-white">{camp.name}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(
                          camp.metaId,
                          "campaign",
                          camp.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                        );
                      }}
                    >
                      <StatusBadge status={camp.status} clickable />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">
                    {camp.dailyBudget ? formatMoney(camp.dailyBudget, currency) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">
                    {formatMoney(camp.spend * 100, currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">
                    {formatNumber(camp.impressions)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{formatNumber(camp.clicks)}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{formatPercent(camp.ctr)}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300">
                    {formatMoney(camp.cpc * 100, currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{camp.conversions}</td>
                  <td className="px-4 py-3">
                    {camp.spendTrend.length > 1 && (
                      <Sparkline data={camp.spendTrend} className="h-6 w-20" />
                    )}
                  </td>
                </tr>

                {/* Expanded: Ad Sets */}
                {expandedCampaign === camp.metaId &&
                  camp.adSets?.map((adSet) => (
                    <>
                      <tr
                        key={adSet.metaId}
                        className="cursor-pointer bg-zinc-900/30 transition-colors hover:bg-white/5"
                        onClick={() =>
                          setExpandedAdSet(expandedAdSet === adSet.metaId ? null : adSet.metaId)
                        }
                      >
                        <td className="px-4 py-2 pl-8 text-xs text-zinc-600">
                          {expandedAdSet === adSet.metaId ? "\u25BC" : "\u25B6"}
                        </td>
                        <td className="px-4 py-2 text-sm text-zinc-300">{adSet.name}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStatus(
                                adSet.metaId,
                                "adset",
                                adSet.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                              );
                            }}
                          >
                            <StatusBadge status={adSet.status} clickable />
                          </button>
                        </td>
                        <td className="px-4 py-2 text-sm text-zinc-400">
                          {adSet.dailyBudget ? formatMoney(adSet.dailyBudget, currency) : "—"}
                        </td>
                        <td className="px-4 py-2 text-sm text-zinc-400">
                          {formatMoney(adSet.spend * 100, currency)}
                        </td>
                        <td className="px-4 py-2 text-sm text-zinc-400">
                          {formatNumber(adSet.impressions)}
                        </td>
                        <td className="px-4 py-2 text-sm text-zinc-400">
                          {formatNumber(adSet.clicks)}
                        </td>
                        <td className="px-4 py-2 text-sm text-zinc-400">
                          {formatPercent(adSet.ctr)}
                        </td>
                        <td className="px-4 py-2 text-sm text-zinc-400">
                          {formatMoney(adSet.cpc * 100, currency)}
                        </td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2" />
                      </tr>

                      {/* Expanded: Ads */}
                      {expandedAdSet === adSet.metaId &&
                        adSet.ads?.map((ad) => (
                          <tr
                            key={ad.metaId}
                            className="bg-zinc-900/50"
                          >
                            <td className="px-4 py-2 pl-12" />
                            <td className="px-4 py-2 text-xs text-zinc-400">{ad.name}</td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() =>
                                  onToggleStatus(
                                    ad.metaId,
                                    "ad",
                                    ad.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                                  )
                                }
                              >
                                <StatusBadge status={ad.status} clickable />
                              </button>
                            </td>
                            <td className="px-4 py-2" />
                            <td className="px-4 py-2 text-xs text-zinc-400">
                              {formatMoney(ad.spend * 100, currency)}
                            </td>
                            <td className="px-4 py-2 text-xs text-zinc-400">
                              {formatNumber(ad.impressions)}
                            </td>
                            <td className="px-4 py-2 text-xs text-zinc-400">
                              {formatNumber(ad.clicks)}
                            </td>
                            <td className="px-4 py-2 text-xs text-zinc-400">
                              {formatPercent(ad.ctr)}
                            </td>
                            <td className="px-4 py-2 text-xs text-zinc-400">
                              {formatMoney(ad.cpc * 100, currency)}
                            </td>
                            <td className="px-4 py-2" />
                            <td className="px-4 py-2" />
                          </tr>
                        ))}
                    </>
                  ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
