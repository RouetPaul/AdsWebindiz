import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  adAccounts,
  campaigns,
  adSets,
  ads,
  dailyInsights,
  syncLog,
  syncSteps,
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

type LogLevel = "info" | "success" | "warn" | "error";

async function logStep(syncId: number, level: LogLevel, message: string, detail?: string) {
  await db.insert(syncSteps).values({ syncId, level, message, detail });
}

export async function POST(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const isManualTrigger = request.headers.get("x-manual-sync") === "1";

  if (cronSecret && !isVercelCron && !isManualTrigger && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Create sync log entry
  const [log] = await db.insert(syncLog).values({}).returning();
  const syncId = log.id;
  const since = daysAgo(30);
  const until = daysAgo(0);
  let accountCount = 0;

  await logStep(syncId, "info", "Sync démarrée", `Période: ${since} → ${until} | Business ID: ${process.env.META_BUSINESS_ID} | API: ${process.env.META_API_VERSION}`);

  try {
    // 1. Fetch all ad accounts (owned + client)
    await logStep(syncId, "info", "Récupération des ad accounts (owned + client) depuis Meta...");
    const metaAccounts = await getAdAccounts();

    if (metaAccounts.length === 0) {
      await logStep(syncId, "warn", "Aucun ad account trouvé", "Vérifiez que le System User Token a accès aux ad accounts du Business Manager et que les comptes sont bien assignés (owned ou client).");
    } else {
      await logStep(syncId, "success", `${metaAccounts.length} ad account(s) trouvé(s)`, metaAccounts.map((a) => `${a.name} (${a.account_id}, status=${a.account_status})`).join(" | "));
    }

    for (const acc of metaAccounts) {
      // Use business_name as fallback when name is just the account ID
      const displayName = (acc.business_name && acc.business_name !== acc.account_id)
        ? acc.business_name
        : (acc.name !== acc.account_id ? acc.name : acc.business_name ?? acc.name);

      await logStep(syncId, "info", `▸ Sync compte "${displayName}" (${acc.account_id})...`);

      // Upsert account
      await db
        .insert(adAccounts)
        .values({
          metaId: acc.id,
          accountId: acc.account_id,
          name: displayName,
          status: acc.account_status,
          currency: acc.currency,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: adAccounts.metaId,
          set: {
            name: displayName,
            status: acc.account_status,
            currency: acc.currency,
            lastSyncedAt: new Date(),
          },
        });

      // 2. Fetch campaigns
      await logStep(syncId, "info", `  Récupération des campagnes pour ${acc.name}...`);
      const metaCampaigns = await getCampaigns(acc.account_id);
      await logStep(syncId, "success", `  ${metaCampaigns.length} campagne(s) trouvée(s)`);

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

        // 3. Fetch ad sets
        const metaAdSets = await getAdSets(camp.id);
        let adCount = 0;

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

          // 4. Fetch ads
          const metaAds = await getAds(adSet.id);
          adCount += metaAds.length;

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

        await logStep(syncId, "info", `  Campagne "${camp.name}": ${metaAdSets.length} ad set(s), ${adCount} ad(s)`);

        // 5. Fetch insights
        try {
          const campInsights = await getInsights(camp.id, since, until);
          // Delete old + insert fresh
          await db.delete(dailyInsights).where(eq(dailyInsights.objectId, camp.id));
          for (const insight of campInsights) {
            await db.insert(dailyInsights).values({
              objectId: camp.id,
              objectType: "campaign",
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
          if (campInsights.length > 0) {
            await logStep(syncId, "success", `  Insights "${camp.name}": ${campInsights.length} jour(s) importé(s)`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await logStep(syncId, "warn", `  Insights "${camp.name}" échoué`, msg);
        }
      }

      // Account-level insights
      try {
        await logStep(syncId, "info", `  Récupération insights compte ${acc.name}...`);
        const accInsights = await getInsights(acc.id, since, until);
        await db.delete(dailyInsights).where(eq(dailyInsights.objectId, acc.id));
        for (const insight of accInsights) {
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
        await logStep(syncId, "success", `  Insights compte: ${accInsights.length} jour(s)`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await logStep(syncId, "warn", `  Insights compte ${acc.name} échoué`, msg);
      }

      accountCount++;
      await logStep(syncId, "success", `✓ Compte "${acc.name}" synchronisé`);
    }

    // Done
    await db
      .update(syncLog)
      .set({ status: "completed", completedAt: new Date(), accountsSynced: accountCount })
      .where(eq(syncLog.id, syncId));

    await logStep(syncId, "success", `Sync terminée — ${accountCount} compte(s) synchronisé(s)`);

    return NextResponse.json({ success: true, syncId, accountsSynced: accountCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;

    await logStep(syncId, "error", `Sync échouée: ${message}`, stack);
    await db
      .update(syncLog)
      .set({ status: "failed", completedAt: new Date(), accountsSynced: accountCount, error: message })
      .where(eq(syncLog.id, syncId));

    return NextResponse.json({ error: message, syncId }, { status: 500 });
  }
}
