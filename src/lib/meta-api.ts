import type {
  MetaAdAccount,
  MetaCampaign,
  MetaAdSet,
  MetaAd,
  MetaInsight,
  MetaResponse,
  MetaError,
  CampaignStatus,
  AdSetStatus,
  AdStatus,
} from "@/types/meta";

const BASE_URL = `https://graph.facebook.com/${process.env.META_API_VERSION}`;
const TOKEN = () => process.env.META_SYSTEM_USER_TOKEN!;
const BIZ_ID = () => process.env.META_BUSINESS_ID!;

// ─── Rate-limit retry with exponential backoff ──────────────────────────────

async function metaFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const maxRetries = 5;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, init);

    if (res.ok) {
      return res.json() as Promise<T>;
    }

    const body = (await res.json()) as MetaError;
    const code = body.error?.code;

    // Rate limit (17) or transient — retry with backoff
    if ((code === 17 || code === 2 || res.status === 429) && attempt < maxRetries) {
      const delay = Math.min(1000 * 2 ** attempt, 60_000);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    // Token expired
    if (code === 190) {
      throw new MetaApiError("Meta token expired or invalid. Update META_SYSTEM_USER_TOKEN.", code);
    }

    throw new MetaApiError(body.error?.message ?? `Meta API error ${res.status}`, code ?? res.status);
  }

  throw new MetaApiError("Max retries exceeded", 17);
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    public code: number,
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

// ─── Pagination helper ──────────────────────────────────────────────────────

async function fetchAllPages<T>(url: string): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | undefined = url;

  while (nextUrl) {
    const page: MetaResponse<T> = await metaFetch<MetaResponse<T>>(nextUrl);
    items.push(...page.data);
    nextUrl = page.paging?.next;
  }

  return items;
}

// ─── Auth helper ────────────────────────────────────────────────────────────

function authUrl(path: string, params: Record<string, string> = {}): string {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("access_token", TOKEN());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getAdAccounts(): Promise<MetaAdAccount[]> {
  const fields = "id,account_id,name,business_name,account_status,currency,spend_cap,amount_spent,balance";

  // Fetch both owned and client ad accounts (agencies have client accounts)
  const [owned, client] = await Promise.all([
    fetchAllPages<MetaAdAccount>(
      authUrl(`/${BIZ_ID()}/owned_ad_accounts`, { fields, limit: "100" }),
    ),
    fetchAllPages<MetaAdAccount>(
      authUrl(`/${BIZ_ID()}/client_ad_accounts`, { fields, limit: "100" }),
    ),
  ]);

  // Deduplicate by id
  const map = new Map<string, MetaAdAccount>();
  for (const acc of [...owned, ...client]) {
    map.set(acc.id, acc);
  }
  return Array.from(map.values());
}

export async function getCampaigns(accountId: string): Promise<MetaCampaign[]> {
  return fetchAllPages<MetaCampaign>(
    authUrl(`/act_${accountId}/campaigns`, {
      fields: "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,buying_type",
      limit: "100",
    }),
  );
}

export async function getAdSets(campaignId: string): Promise<MetaAdSet[]> {
  return fetchAllPages<MetaAdSet>(
    authUrl(`/${campaignId}/adsets`, {
      fields: "id,name,status,daily_budget,targeting,optimization_goal,billing_event",
      limit: "100",
    }),
  );
}

export async function getAds(adSetId: string): Promise<MetaAd[]> {
  return fetchAllPages<MetaAd>(
    authUrl(`/${adSetId}/ads`, {
      fields: "id,name,status,creative",
      limit: "100",
    }),
  );
}

export async function getInsights(
  objectId: string,
  since: string,
  until: string,
): Promise<MetaInsight[]> {
  return fetchAllPages<MetaInsight>(
    authUrl(`/${objectId}/insights`, {
      fields: "spend,impressions,clicks,cpc,cpm,ctr,actions,cost_per_action_type,reach,frequency",
      time_range: JSON.stringify({ since, until }),
      time_increment: "1",
      limit: "100",
    }),
  );
}

export async function updateStatus(
  objectId: string,
  status: CampaignStatus | AdSetStatus | AdStatus,
): Promise<{ success: boolean }> {
  return metaFetch<{ success: boolean }>(authUrl(`/${objectId}`), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `status=${status}`,
  });
}
