import { db } from "@/lib/db";
import { adAccounts, campaigns, dailyInsights, syncLog } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import { daysAgo } from "@/lib/utils";
import { DashboardClient } from "./dashboard-client";
import type { DateRange } from "@/components/dashboard/date-range-picker";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ days?: string }>;
}

async function getDashboardData(days: number) {
  const since = daysAgo(days);
  const until = daysAgo(0);
  const prevSince = daysAgo(days * 2);
  const prevUntil = daysAgo(days + 1);

  const accounts = await db.select().from(adAccounts);

  const currentInsights = await db
    .select({
      objectId: dailyInsights.objectId,
      spend: sql<number>`coalesce(sum(${dailyInsights.spend}), 0)`,
      impressions: sql<number>`coalesce(sum(${dailyInsights.impressions}), 0)`,
      clicks: sql<number>`coalesce(sum(${dailyInsights.clicks}), 0)`,
      reach: sql<number>`coalesce(sum(${dailyInsights.reach}), 0)`,
    })
    .from(dailyInsights)
    .where(
      and(
        eq(dailyInsights.objectType, "account"),
        gte(dailyInsights.date, since),
        lte(dailyInsights.date, until),
      ),
    )
    .groupBy(dailyInsights.objectId);

  const prevInsights = await db
    .select({
      objectId: dailyInsights.objectId,
      spend: sql<number>`coalesce(sum(${dailyInsights.spend}), 0)`,
      impressions: sql<number>`coalesce(sum(${dailyInsights.impressions}), 0)`,
      clicks: sql<number>`coalesce(sum(${dailyInsights.clicks}), 0)`,
    })
    .from(dailyInsights)
    .where(
      and(
        eq(dailyInsights.objectType, "account"),
        gte(dailyInsights.date, prevSince),
        lte(dailyInsights.date, prevUntil),
      ),
    )
    .groupBy(dailyInsights.objectId);

  const dailySpend = await db
    .select({
      objectId: dailyInsights.objectId,
      date: dailyInsights.date,
      spend: dailyInsights.spend,
    })
    .from(dailyInsights)
    .where(
      and(
        eq(dailyInsights.objectType, "account"),
        gte(dailyInsights.date, since),
        lte(dailyInsights.date, until),
      ),
    )
    .orderBy(dailyInsights.date);

  const activeCounts = await db
    .select({
      accountId: campaigns.accountId,
      count: count(),
    })
    .from(campaigns)
    .where(eq(campaigns.status, "ACTIVE"))
    .groupBy(campaigns.accountId);

  const [lastSync] = await db
    .select()
    .from(syncLog)
    .where(eq(syncLog.status, "completed"))
    .orderBy(desc(syncLog.completedAt))
    .limit(1);

  const currentMap = new Map(currentInsights.map((r) => [r.objectId, r]));
  const prevMap = new Map(prevInsights.map((r) => [r.objectId, r]));
  const activeMap = new Map(activeCounts.map((r) => [r.accountId, r.count]));

  const trendMap = new Map<string, number[]>();
  for (const row of dailySpend) {
    const list = trendMap.get(row.objectId) ?? [];
    list.push(row.spend ?? 0);
    trendMap.set(row.objectId, list);
  }

  let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalReach = 0;
  let prevTotalSpend = 0, prevTotalImpressions = 0, prevTotalClicks = 0;

  for (const ins of currentInsights) {
    totalSpend += ins.spend;
    totalImpressions += ins.impressions;
    totalClicks += ins.clicks;
    totalReach += ins.reach;
  }
  for (const ins of prevInsights) {
    prevTotalSpend += ins.spend;
    prevTotalImpressions += ins.impressions;
    prevTotalClicks += ins.clicks;
  }

  const totalCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const totalCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const prevCtr = prevTotalImpressions > 0 ? (prevTotalClicks / prevTotalImpressions) * 100 : 0;
  const prevCpc = prevTotalClicks > 0 ? prevTotalSpend / prevTotalClicks : 0;

  const accountCards = accounts.map((acc) => {
    const curr = currentMap.get(acc.metaId);
    const prev = prevMap.get(acc.metaId);
    const spend = curr?.spend ?? 0;
    const prevSpend = prev?.spend ?? 0;
    const change = prevSpend > 0 ? ((spend - prevSpend) / prevSpend) * 100 : undefined;

    return {
      metaId: acc.metaId,
      accountId: acc.accountId,
      name: acc.name,
      status: acc.status,
      currency: acc.currency,
      spend,
      activeCampaigns: activeMap.get(acc.metaId) ?? 0,
      spendTrend: trendMap.get(acc.metaId) ?? [],
      change,
    };
  });

  return {
    metrics: {
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: totalCtr,
      cpc: totalCpc,
      reach: totalReach,
      prevSpend: prevTotalSpend,
      prevImpressions: prevTotalImpressions,
      prevClicks: prevTotalClicks,
      prevCtr,
      prevCpc,
    },
    accounts: accountCards,
    lastSyncedAt: lastSync?.completedAt?.toISOString() ?? null,
  };
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { days: daysParam } = await searchParams;
  const days = ["1", "7", "14", "30"].includes(daysParam ?? "") ? parseInt(daysParam!) : 7;
  const dateRange = String(days) as DateRange;

  const data = await getDashboardData(days);

  return <DashboardClient initialData={data} dateRange={dateRange} />;
}
