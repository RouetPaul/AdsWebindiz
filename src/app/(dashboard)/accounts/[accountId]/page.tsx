import { db } from "@/lib/db";
import {
  adAccounts,
  campaigns,
  adSets,
  ads,
  dailyInsights,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { daysAgo, extractConversions } from "@/lib/utils";
import { AccountDetailClient } from "./account-detail-client";
import type { DateRange } from "@/components/dashboard/date-range-picker";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ days?: string }>;
}

export default async function AccountDetailPage({ params, searchParams }: PageProps) {
  const { accountId } = await params;
  const { days: daysParam } = await searchParams;
  const days = ["1", "7", "14", "30"].includes(daysParam ?? "") ? parseInt(daysParam!) : 7;
  const dateRange = String(days) as DateRange;
  const since = daysAgo(days);
  const until = daysAgo(0);

  // Get account info
  const [account] = await db
    .select()
    .from(adAccounts)
    .where(eq(adAccounts.accountId, accountId))
    .limit(1);

  if (!account) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-zinc-400">Compte introuvable</p>
      </div>
    );
  }

  // Get campaigns for this account
  const accountCampaigns = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.accountId, account.metaId));

  const campaignIds = accountCampaigns.map((c) => c.metaId);

  // Get insights ONLY for this account's campaigns
  const campaignInsights = campaignIds.length > 0
    ? await db
        .select({
          objectId: dailyInsights.objectId,
          spend: sql<number>`coalesce(sum(${dailyInsights.spend}), 0)`,
          impressions: sql<number>`coalesce(sum(${dailyInsights.impressions}), 0)`,
          clicks: sql<number>`coalesce(sum(${dailyInsights.clicks}), 0)`,
          ctr: sql<number>`case when sum(${dailyInsights.impressions}) > 0 then sum(${dailyInsights.clicks})::float / sum(${dailyInsights.impressions}) * 100 else 0 end`,
          cpc: sql<number>`case when sum(${dailyInsights.clicks}) > 0 then sum(${dailyInsights.spend}) / sum(${dailyInsights.clicks}) else 0 end`,
        })
        .from(dailyInsights)
        .where(
          and(
            inArray(dailyInsights.objectId, campaignIds),
            eq(dailyInsights.objectType, "campaign"),
            gte(dailyInsights.date, since),
            lte(dailyInsights.date, until),
          ),
        )
        .groupBy(dailyInsights.objectId)
    : [];

  // Get raw insights for conversions extraction (per campaign)
  const rawInsights = campaignIds.length > 0
    ? await db
        .select({
          objectId: dailyInsights.objectId,
          conversions: dailyInsights.conversions,
        })
        .from(dailyInsights)
        .where(
          and(
            inArray(dailyInsights.objectId, campaignIds),
            eq(dailyInsights.objectType, "campaign"),
            gte(dailyInsights.date, since),
            lte(dailyInsights.date, until),
          ),
        )
    : [];

  // Aggregate conversions per campaign
  const convMap = new Map<string, number>();
  for (const row of rawInsights) {
    const prev = convMap.get(row.objectId) ?? 0;
    convMap.set(row.objectId, prev + extractConversions(row.conversions));
  }

  // Daily spend per campaign (for sparklines) — scoped to this account
  const dailySpend = campaignIds.length > 0
    ? await db
        .select({
          objectId: dailyInsights.objectId,
          date: dailyInsights.date,
          spend: dailyInsights.spend,
        })
        .from(dailyInsights)
        .where(
          and(
            inArray(dailyInsights.objectId, campaignIds),
            eq(dailyInsights.objectType, "campaign"),
            gte(dailyInsights.date, since),
            lte(dailyInsights.date, until),
          ),
        )
        .orderBy(dailyInsights.date)
    : [];

  // Account-level insights
  const [accInsight] = await db
    .select({
      spend: sql<number>`coalesce(sum(${dailyInsights.spend}), 0)`,
      impressions: sql<number>`coalesce(sum(${dailyInsights.impressions}), 0)`,
      clicks: sql<number>`coalesce(sum(${dailyInsights.clicks}), 0)`,
      reach: sql<number>`coalesce(sum(${dailyInsights.reach}), 0)`,
    })
    .from(dailyInsights)
    .where(
      and(
        eq(dailyInsights.objectId, account.metaId),
        eq(dailyInsights.objectType, "account"),
        gte(dailyInsights.date, since),
        lte(dailyInsights.date, until),
      ),
    );

  // Get ad sets & ads for this account's campaigns only
  const allAdSets = campaignIds.length > 0
    ? await db.select().from(adSets).where(inArray(adSets.campaignId, campaignIds))
    : [];
  const adSetIds = allAdSets.map((as) => as.metaId);
  const allAds = adSetIds.length > 0
    ? await db.select().from(ads).where(inArray(ads.adSetId, adSetIds))
    : [];

  // Build maps
  const insightMap = new Map(campaignInsights.map((r) => [r.objectId, r]));
  const trendMap = new Map<string, number[]>();
  for (const row of dailySpend) {
    const list = trendMap.get(row.objectId) ?? [];
    list.push(row.spend ?? 0);
    trendMap.set(row.objectId, list);
  }

  const totalSpend = accInsight?.spend ?? 0;
  const totalImpressions = accInsight?.impressions ?? 0;
  const totalClicks = accInsight?.clicks ?? 0;
  const totalReach = accInsight?.reach ?? 0;
  const totalCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const totalCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

  const campaignRows = accountCampaigns.map((c) => {
    const ins = insightMap.get(c.metaId);
    const campAdSets = allAdSets
      .filter((as) => as.campaignId === c.metaId)
      .map((as) => ({
        metaId: as.metaId,
        name: as.name,
        status: as.status,
        dailyBudget: as.dailyBudget,
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        ads: allAds
          .filter((ad) => ad.adSetId === as.metaId)
          .map((ad) => ({
            metaId: ad.metaId,
            name: ad.name,
            status: ad.status,
            spend: 0,
            impressions: 0,
            clicks: 0,
            ctr: 0,
            cpc: 0,
          })),
      }));

    return {
      metaId: c.metaId,
      name: c.name,
      status: c.status,
      objective: c.objective,
      dailyBudget: c.dailyBudget,
      spend: ins?.spend ?? 0,
      impressions: ins?.impressions ?? 0,
      clicks: ins?.clicks ?? 0,
      ctr: ins?.ctr ?? 0,
      cpc: ins?.cpc ?? 0,
      conversions: convMap.get(c.metaId) ?? 0,
      spendTrend: trendMap.get(c.metaId) ?? [],
      currency: account.currency,
      adSets: campAdSets,
    };
  });

  return (
    <AccountDetailClient
      account={{
        name: account.name,
        accountId: account.accountId,
        currency: account.currency,
        lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
      }}
      metrics={{
        spend: totalSpend,
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: totalCtr,
        cpc: totalCpc,
        reach: totalReach,
        currency: account.currency,
      }}
      campaigns={campaignRows}
      dateRange={dateRange}
    />
  );
}
