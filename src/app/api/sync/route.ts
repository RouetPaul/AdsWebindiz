import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  adAccounts,
  campaigns,
  adSets,
  ads,
  dailyInsights,
  syncLog,
} from "@/lib/db/schema";
import {
  getAdAccounts,
  getCampaigns,
  getAdSets,
  getAds,
  getInsights,
} from "@/lib/meta-api";
import { daysAgo } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  // Auth: verify cron secret or manual trigger
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Create sync log entry
  const [log] = await db.insert(syncLog).values({}).returning();
  const since = daysAgo(7);
  const until = daysAgo(0);
  let accountCount = 0;

  try {
    // 1. Fetch all ad accounts
    const metaAccounts = await getAdAccounts();

    for (const acc of metaAccounts) {
      // Upsert account
      await db
        .insert(adAccounts)
        .values({
          metaId: acc.id,
          accountId: acc.account_id,
          name: acc.name,
          status: acc.account_status,
          currency: acc.currency,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: adAccounts.metaId,
          set: {
            name: acc.name,
            status: acc.account_status,
            currency: acc.currency,
            lastSyncedAt: new Date(),
          },
        });

      // 2. Fetch campaigns for this account
      const metaCampaigns = await getCampaigns(acc.account_id);

      for (const camp of metaCampaigns) {
        await db
          .insert(campaigns)
          .values({
            metaId: camp.id,
            accountId: acc.id,
            name: camp.name,
            status: camp.status,
            objective: camp.objective,
            dailyBudget: camp.daily_budget ? parseInt(camp.daily_budget) : null,
            lifetimeBudget: camp.lifetime_budget ? parseInt(camp.lifetime_budget) : null,
          })
          .onConflictDoUpdate({
            target: campaigns.metaId,
            set: {
              name: camp.name,
              status: camp.status,
              objective: camp.objective,
              dailyBudget: camp.daily_budget ? parseInt(camp.daily_budget) : null,
              lifetimeBudget: camp.lifetime_budget ? parseInt(camp.lifetime_budget) : null,
              updatedAt: new Date(),
            },
          });

        // 3. Fetch ad sets for this campaign
        const metaAdSets = await getAdSets(camp.id);

        for (const adSet of metaAdSets) {
          await db
            .insert(adSets)
            .values({
              metaId: adSet.id,
              campaignId: camp.id,
              name: adSet.name,
              status: adSet.status,
              dailyBudget: adSet.daily_budget ? parseInt(adSet.daily_budget) : null,
              optimizationGoal: adSet.optimization_goal,
            })
            .onConflictDoUpdate({
              target: adSets.metaId,
              set: {
                name: adSet.name,
                status: adSet.status,
                dailyBudget: adSet.daily_budget ? parseInt(adSet.daily_budget) : null,
                optimizationGoal: adSet.optimization_goal,
              },
            });

          // 4. Fetch ads for this ad set
          const metaAds = await getAds(adSet.id);

          for (const ad of metaAds) {
            await db
              .insert(ads)
              .values({
                metaId: ad.id,
                adSetId: adSet.id,
                name: ad.name,
                status: ad.status,
              })
              .onConflictDoUpdate({
                target: ads.metaId,
                set: {
                  name: ad.name,
                  status: ad.status,
                },
              });
          }
        }

        // 5. Fetch insights for this campaign (last 7 days)
        const campInsights = await getInsights(camp.id, since, until);
        for (const insight of campInsights) {
          const date = insight.date_start;
          // Upsert: delete existing then insert
          await db
            .delete(dailyInsights)
            .where(
              eq(dailyInsights.objectId, camp.id),
            );

          await db.insert(dailyInsights).values({
            objectId: camp.id,
            objectType: "campaign",
            date,
            spend: parseFloat(insight.spend || "0"),
            impressions: parseInt(insight.impressions || "0"),
            clicks: parseInt(insight.clicks || "0"),
            cpc: parseFloat(insight.cpc || "0"),
            cpm: parseFloat(insight.cpm || "0"),
            ctr: parseFloat(insight.ctr || "0"),
            reach: parseInt(insight.reach || "0"),
            frequency: parseFloat(insight.frequency || "0"),
            conversions: insight.actions ?? null,
          });
        }
      }

      // Account-level insights
      const accInsights = await getInsights(acc.id, since, until);
      for (const insight of accInsights) {
        await db
          .delete(dailyInsights)
          .where(eq(dailyInsights.objectId, acc.id));

        await db.insert(dailyInsights).values({
          objectId: acc.id,
          objectType: "account",
          date: insight.date_start,
          spend: parseFloat(insight.spend || "0"),
          impressions: parseInt(insight.impressions || "0"),
          clicks: parseInt(insight.clicks || "0"),
          cpc: parseFloat(insight.cpc || "0"),
          cpm: parseFloat(insight.cpm || "0"),
          ctr: parseFloat(insight.ctr || "0"),
          reach: parseInt(insight.reach || "0"),
          frequency: parseFloat(insight.frequency || "0"),
          conversions: insight.actions ?? null,
        });
      }

      accountCount++;
    }

    // Update sync log
    await db
      .update(syncLog)
      .set({
        status: "completed",
        completedAt: new Date(),
        accountsSynced: accountCount,
      })
      .where(eq(syncLog.id, log.id));

    return NextResponse.json({
      success: true,
      accountsSynced: accountCount,
    });
  } catch (error) {
    console.error("Sync failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    await db
      .update(syncLog)
      .set({
        status: "failed",
        completedAt: new Date(),
        accountsSynced: accountCount,
        error: message,
      })
      .where(eq(syncLog.id, log.id));

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
