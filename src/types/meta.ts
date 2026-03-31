// ─── Meta API Response Types ─────────────────────────────────────────────────

export interface MetaPaging {
  cursors?: { before: string; after: string };
  next?: string;
}

export interface MetaResponse<T> {
  data: T[];
  paging?: MetaPaging;
}

export interface MetaError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

// ─── Ad Account ──────────────────────────────────────────────────────────────

export type AccountStatus = 1 | 2 | 3 | 7 | 8 | 9 | 100 | 101 | 201;

export interface MetaAdAccount {
  id: string;
  account_id: string;
  name: string;
  business_name?: string;
  account_status: AccountStatus;
  currency: string;
  spend_cap?: string;
  amount_spent: string;
  balance: string;
}

// ─── Campaign ────────────────────────────────────────────────────────────────

export type CampaignStatus = "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
export type CampaignObjective =
  | "OUTCOME_AWARENESS"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_LEADS"
  | "OUTCOME_SALES"
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_APP_PROMOTION";

export interface MetaCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  objective: CampaignObjective;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  buying_type: string;
}

// ─── Ad Set ──────────────────────────────────────────────────────────────────

export type AdSetStatus = "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";

export interface MetaAdSet {
  id: string;
  name: string;
  status: AdSetStatus;
  daily_budget?: string;
  targeting?: Record<string, unknown>;
  optimization_goal: string;
  billing_event: string;
}

// ─── Ad ──────────────────────────────────────────────────────────────────────

export type AdStatus = "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";

export interface MetaAd {
  id: string;
  name: string;
  status: AdStatus;
  creative?: { id: string };
}

// ─── Insights ────────────────────────────────────────────────────────────────

export interface MetaAction {
  action_type: string;
  value: string;
}

export interface MetaInsight {
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  clicks: string;
  cpc: string;
  cpm: string;
  ctr: string;
  reach: string;
  frequency: string;
  actions?: MetaAction[];
  cost_per_action_type?: MetaAction[];
}

// ─── Mapped Entity Status (for display) ─────────────────────────────────────

export type EntityStatus = "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED" | "ERROR";
