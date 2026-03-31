import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  pgEnum,
  index,
  bigint,
  serial,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const objectTypeEnum = pgEnum("object_type", [
  "account",
  "campaign",
  "adset",
  "ad",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "running",
  "completed",
  "failed",
]);

// ─── Ad Accounts ─────────────────────────────────────────────────────────────

export const adAccounts = pgTable("ad_accounts", {
  id: serial("id").primaryKey(),
  metaId: text("meta_id").notNull().unique(),
  accountId: text("account_id").notNull(),
  name: text("name").notNull(),
  status: integer("status").notNull(),
  currency: text("currency").notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
});

// ─── Campaigns ───────────────────────────────────────────────────────────────

export const campaigns = pgTable(
  "campaigns",
  {
    id: serial("id").primaryKey(),
    metaId: text("meta_id").notNull().unique(),
    accountId: text("account_id")
      .notNull()
      .references(() => adAccounts.metaId),
    name: text("name").notNull(),
    status: text("status").notNull(),
    objective: text("objective"),
    dailyBudget: bigint("daily_budget", { mode: "number" }),
    lifetimeBudget: bigint("lifetime_budget", { mode: "number" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("campaigns_account_idx").on(t.accountId)],
);

// ─── Ad Sets ─────────────────────────────────────────────────────────────────

export const adSets = pgTable("ad_sets", {
  id: serial("id").primaryKey(),
  metaId: text("meta_id").notNull().unique(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.metaId),
  name: text("name").notNull(),
  status: text("status").notNull(),
  dailyBudget: bigint("daily_budget", { mode: "number" }),
  optimizationGoal: text("optimization_goal"),
});

// ─── Ads ─────────────────────────────────────────────────────────────────────

export const ads = pgTable("ads", {
  id: serial("id").primaryKey(),
  metaId: text("meta_id").notNull().unique(),
  adSetId: text("ad_set_id")
    .notNull()
    .references(() => adSets.metaId),
  name: text("name").notNull(),
  status: text("status").notNull(),
});

// ─── Daily Insights ──────────────────────────────────────────────────────────

export const dailyInsights = pgTable(
  "daily_insights",
  {
    id: serial("id").primaryKey(),
    objectId: text("object_id").notNull(),
    objectType: objectTypeEnum("object_type").notNull(),
    date: text("date").notNull(),
    spend: real("spend").default(0),
    impressions: integer("impressions").default(0),
    clicks: integer("clicks").default(0),
    cpc: real("cpc").default(0),
    cpm: real("cpm").default(0),
    ctr: real("ctr").default(0),
    reach: integer("reach").default(0),
    frequency: real("frequency").default(0),
    conversions: jsonb("conversions"),
    syncedAt: timestamp("synced_at").defaultNow(),
  },
  (t) => [index("insights_object_date_idx").on(t.objectId, t.date)],
);

// ─── Sync Log ────────────────────────────────────────────────────────────────

export const syncLog = pgTable("sync_log", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  status: syncStatusEnum("status").notNull().default("running"),
  accountsSynced: integer("accounts_synced").default(0),
  error: text("error"),
});
