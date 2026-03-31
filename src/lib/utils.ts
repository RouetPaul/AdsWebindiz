/** Format euros to display currency (Meta insights are already in euros) */
export function formatMoney(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Format centimes to euros then display (Meta budgets are in centimes) */
export function formatBudget(centimes: number, currency = "EUR"): string {
  return formatMoney(centimes / 100, currency);
}

/** Format large numbers with abbreviations */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("fr-FR");
}

/** Format percentage */
export function formatPercent(n: number): string {
  return `${n.toFixed(2)}%`;
}

/** Get date string N days ago as YYYY-MM-DD */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Relative time display */
export function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMin = Math.floor((now - then) / 60_000);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `il y a ${diffD}j`;
}

/** Map Meta account_status int to readable status */
export function accountStatusLabel(status: number): string {
  const map: Record<number, string> = {
    1: "ACTIVE",
    2: "DISABLED",
    3: "UNSETTLED",
    7: "PENDING_RISK_REVIEW",
    8: "PENDING_SETTLEMENT",
    9: "IN_GRACE_PERIOD",
    100: "PENDING_CLOSURE",
    101: "CLOSED",
    201: "ANY_ACTIVE",
  };
  return map[status] ?? "UNKNOWN";
}

/** Map Meta campaign objective to French label */
export function objectiveLabel(objective: string | null): string {
  if (!objective) return "—";
  const map: Record<string, string> = {
    OUTCOME_AWARENESS: "Notoriété",
    OUTCOME_ENGAGEMENT: "Engagement",
    OUTCOME_LEADS: "Prospects",
    OUTCOME_SALES: "Conversions",
    OUTCOME_TRAFFIC: "Trafic",
    OUTCOME_APP_PROMOTION: "App",
    LINK_CLICKS: "Clics",
    POST_ENGAGEMENT: "Engagement",
    REACH: "Couverture",
    BRAND_AWARENESS: "Notoriété",
    VIDEO_VIEWS: "Vues vidéo",
    MESSAGES: "Messages",
    CONVERSIONS: "Conversions",
    LEAD_GENERATION: "Génération de prospects",
  };
  return map[objective] ?? objective;
}

/** Extract conversion count from Meta actions array */
export function extractConversions(actions: unknown): number {
  if (!Array.isArray(actions)) return 0;
  let total = 0;
  for (const action of actions) {
    const a = action as { action_type?: string; value?: string };
    if (
      a.action_type === "purchase" ||
      a.action_type === "offsite_conversion.fb_pixel_purchase" ||
      a.action_type === "lead" ||
      a.action_type === "offsite_conversion.fb_pixel_lead" ||
      a.action_type === "complete_registration" ||
      a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
      a.action_type === "omni_purchase" ||
      a.action_type === "onsite_conversion.messaging_conversation_started_7d"
    ) {
      total += parseInt(a.value ?? "0");
    }
  }
  return total;
}

/** cn utility for conditional classNames */
export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
