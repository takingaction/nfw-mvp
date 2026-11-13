/**
 * Member-by-member comparison of paid members in our database against
 * Stripe subscriptions, with one reason for every member or subscription that
 * doesn't line up.
 *
 * Headline: DB paid members (contributing/founding, not admin) vs Stripe
 * subscriptions in good standing (active or trialing; "canceling" subs are
 * still active in Stripe). The reasons explain the gap exactly:
 *
 *   gap = DB paid − Stripe good-standing
 *       = (paid members with no good-standing subscription)
 *       − (good-standing subscriptions with no paid member)
 *       − (extra subscriptions held by one member)
 *
 * Matching: Stripe customer id first (profiles.stripe_customer_id), then the
 * Stripe customer's email. Pure function: no I/O, so it can be unit-tested.
 */

export type StripeTier = "contributing" | "founding" | "other";

/** One Stripe subscription, as stored in stripe_subscriptions_cache. */
export type StripeSubRecord = {
  id: string;
  customer: string;
  /** Customer email, lowercased; null if the customer has none or was deleted. */
  email: string | null;
  status: string;
  tier: StripeTier;
  /** Price in cents of the first item. */
  amount: number | null;
  /** cancel_at_period_end or a scheduled cancel_at. */
  cancelScheduled: boolean;
  /** Epoch seconds. */
  created: number;
  endedAt: number | null;
};

export type ReconProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  membership_level: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  is_admin: boolean | null;
  /** Set when an admin marked the membership complimentary (migration 223). */
  comped_at?: string | null;
};

export type ReasonKey =
  | "cancelled_in_stripe"
  | "past_due_in_stripe"
  | "incomplete_in_stripe"
  | "customer_without_subscription"
  | "no_stripe_record"
  | "shares_subscription"
  | "gift_no_subscription"
  | "comped"
  | "paid_in_stripe_not_in_db"
  | "stripe_no_profile"
  | "admin_subscription"
  | "duplicate_subscriptions"
  | "tier_mismatch"
  | "linked_by_email_only"
  | "cancel_status_mismatch";

type Side = "db" | "stripe" | "info";

export const REASONS: Record<ReasonKey, { label: string; description: string; side: Side; expected?: boolean }> = {
  cancelled_in_stripe: {
    label: "Cancelled in Stripe, still paid in DB",
    description:
      "Their Stripe subscription ended but the profile is still contributing/founding. The subscription.deleted webhook blocks downgrades for anyone with a past payment.",
    side: "db",
  },
  past_due_in_stripe: {
    label: "Past due / unpaid in Stripe, active in DB",
    description: "Stripe is retrying a failed payment; the webhook doesn't record that status.",
    side: "db",
  },
  incomplete_in_stripe: {
    label: "Incomplete in Stripe, paid in DB",
    description: "The subscription's first payment never completed in Stripe.",
    side: "db",
  },
  customer_without_subscription: {
    label: "Stripe customer with no subscription",
    description: "The profile is linked to a Stripe customer, but that customer has no subscription in Stripe.",
    side: "db",
  },
  no_stripe_record: {
    label: "Paid in DB, nothing in Stripe",
    description:
      "No Stripe customer found by id or email. Set to paid by hand, a payment recorded without a subscription, or a Stripe account under another email.",
    side: "db",
  },
  shares_subscription: {
    label: "Shares a subscription with another profile",
    description: "Two paid profiles match the same Stripe subscription (usually duplicate accounts).",
    side: "db",
  },
  gift_no_subscription: {
    label: "Gift members (expected)",
    description: "Redeemed a gift code, so there's no Stripe subscription by design.",
    side: "db",
    expected: true,
  },
  comped: {
    label: "Comped members (expected)",
    description: "Marked complimentary by an admin, so there's no Stripe subscription by design.",
    side: "db",
    expected: true,
  },
  paid_in_stripe_not_in_db: {
    label: "Paying in Stripe, free/waitlist in DB",
    description: "Active subscription, but the matching profile isn't contributing/founding. The payment never updated the profile.",
    side: "stripe",
  },
  stripe_no_profile: {
    label: "Paying in Stripe, no profile",
    description: "Active subscription whose customer id and email match no profile.",
    side: "stripe",
  },
  admin_subscription: {
    label: "Admin accounts with a subscription",
    description: "Admins are left out of the DB paid count, so their subscriptions show as extra.",
    side: "stripe",
    expected: true,
  },
  duplicate_subscriptions: {
    label: "Extra active subscriptions",
    description:
      "Members paying through more than one active subscription. One row per extra subscription; the one kept is the subscription on their saved Stripe customer, else the oldest.",
    side: "stripe",
  },
  tier_mismatch: {
    label: "Tier differs",
    description: "Matched, but Stripe's price and the profile's tier disagree. Doesn't change the total, only the per-tier counts.",
    side: "info",
  },
  linked_by_email_only: {
    label: "Matched by email only",
    description: "Matched, but the profile's stripe_customer_id is missing or different. Matching breaks if either email changes.",
    side: "info",
  },
  cancel_status_mismatch: {
    label: "Cancellation status differs",
    description: "Matched, but one side says it's set to cancel and the other doesn't.",
    side: "info",
  },
};

export type ReconRow = {
  reason: ReasonKey;
  profile_id: string | null;
  email: string | null;
  full_name: string | null;
  db_level: string | null;
  db_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_status: string | null;
  stripe_tier: StripeTier | null;
  /** Epoch seconds the subscription ended, when it has. */
  ended_at: number | null;
  /** Extra detail, e.g. how many subscriptions or which tiers. */
  note: string | null;
};

export type ReconResult = {
  dbPaid: number;
  stripeGoodStanding: number;
  gap: number;
  byTier: {
    db: { contributing: number; founding: number };
    stripe: { contributing: number; founding: number; other: number };
  };
  groups: { key: ReasonKey; label: string; description: string; side: Side; expected: boolean; count: number; effect: number }[];
  /** Sum of effects; always equals gap. */
  explained: number;
  rows: ReconRow[];
};

const GOOD_STANDING = new Set(["active", "trialing"]);
const isPaidLevel = (l: string | null) => l === "contributing" || l === "founding";

export function reconcileMembers(input: {
  subs: StripeSubRecord[];
  profiles: ReconProfile[];
  giftUserIds: Set<string>;
}): ReconResult {
  const { subs, profiles, giftUserIds } = input;

  const subsByCustomer = new Map<string, StripeSubRecord[]>();
  const customersByEmail = new Map<string, Set<string>>();
  for (const s of subs) {
    if (!subsByCustomer.has(s.customer)) subsByCustomer.set(s.customer, []);
    subsByCustomer.get(s.customer)!.push(s);
    if (s.email) {
      if (!customersByEmail.has(s.email)) customersByEmail.set(s.email, new Set());
      customersByEmail.get(s.email)!.add(s.customer);
    }
  }

  const profileByCustomer = new Map<string, ReconProfile>();
  const profileByEmail = new Map<string, ReconProfile>();
  for (const p of profiles) {
    if (p.stripe_customer_id && !profileByCustomer.has(p.stripe_customer_id)) profileByCustomer.set(p.stripe_customer_id, p);
    const e = p.email?.toLowerCase();
    // Prefer a paid profile when two profiles share an email.
    if (e && (!profileByEmail.has(e) || (isPaidLevel(p.membership_level) && !isPaidLevel(profileByEmail.get(e)!.membership_level)))) {
      profileByEmail.set(e, p);
    }
  }

  const rows: ReconRow[] = [];
  const consumed = new Set<string>(); // subscription ids matched to a paid member
  let duplicateExtras = 0;

  const row = (reason: ReasonKey, p: ReconProfile | null, s: StripeSubRecord | null, note: string | null = null): ReconRow => ({
    reason,
    profile_id: p?.id ?? null,
    email: p?.email ?? s?.email ?? null,
    full_name: p?.full_name ?? null,
    db_level: p?.membership_level ?? null,
    db_status: p?.subscription_status ?? null,
    stripe_customer_id: s?.customer ?? p?.stripe_customer_id ?? null,
    stripe_subscription_id: s?.id ?? null,
    stripe_status: s?.status ?? null,
    stripe_tier: s?.tier ?? null,
    ended_at: s?.endedAt ?? null,
    note,
  });

  const dbPaidProfiles = profiles.filter((p) => !p.is_admin && isPaidLevel(p.membership_level));
  const byTierDb = { contributing: 0, founding: 0 };

  for (const p of dbPaidProfiles) {
    byTierDb[p.membership_level as "contributing" | "founding"]++;

    // Every Stripe customer this member could be: their saved id, plus any
    // customer with the same email.
    const customers = new Set<string>();
    if (p.stripe_customer_id && subsByCustomer.has(p.stripe_customer_id)) customers.add(p.stripe_customer_id);
    const email = p.email?.toLowerCase();
    if (email) for (const c of customersByEmail.get(email) ?? []) customers.add(c);

    const memberSubs = [...customers].flatMap((c) => subsByCustomer.get(c) ?? []);
    const good = memberSubs.filter((s) => GOOD_STANDING.has(s.status));
    const goodFree = good.filter((s) => !consumed.has(s.id));

    if (goodFree.length > 0) {
      // Keep the subscription on their saved customer, else the oldest.
      goodFree.sort(
        (a, b) =>
          Number(b.customer === p.stripe_customer_id) - Number(a.customer === p.stripe_customer_id) || a.created - b.created,
      );
      const primary = goodFree[0];
      goodFree.forEach((s) => consumed.add(s.id));
      for (const extra of goodFree.slice(1)) {
        duplicateExtras++;
        rows.push(row("duplicate_subscriptions", p, extra, `Keeps ${primary.id}; ${goodFree.length} active in total`));
      }
      if (primary.tier !== p.membership_level) {
        rows.push(row("tier_mismatch", p, primary, `Stripe ${primary.tier} ($${(primary.amount ?? 0) / 100}), DB ${p.membership_level}`));
      }
      if (p.stripe_customer_id !== primary.customer) {
        rows.push(
          row(
            "linked_by_email_only",
            p,
            primary,
            p.stripe_customer_id ? `DB has ${p.stripe_customer_id}, active subscription is on ${primary.customer}` : "No stripe_customer_id saved",
          ),
        );
      }
      const dbCanceling = p.subscription_status === "canceling";
      if (dbCanceling !== primary.cancelScheduled) {
        rows.push(row("cancel_status_mismatch", p, primary, primary.cancelScheduled ? "Set to cancel in Stripe, not in DB" : "Canceling in DB, not in Stripe"));
      }
      continue;
    }

    if (good.length > 0) {
      rows.push(row("shares_subscription", p, good[0]));
      continue;
    }

    if (memberSubs.length > 0) {
      const latest = [...memberSubs].sort((a, b) => b.created - a.created)[0];
      const reason: ReasonKey =
        latest.status === "past_due" || latest.status === "unpaid"
          ? "past_due_in_stripe"
          : latest.status === "incomplete" || latest.status === "incomplete_expired"
          ? "incomplete_in_stripe"
          : "cancelled_in_stripe"; // canceled, paused
      rows.push(row(reason, p, latest, memberSubs.length > 1 ? `${memberSubs.length} subscriptions, none active` : null));
      continue;
    }

    if (giftUserIds.has(p.id)) {
      rows.push(row("gift_no_subscription", p, null));
    } else if (p.comped_at) {
      rows.push(row("comped", p, null));
    } else if (p.stripe_customer_id) {
      rows.push(row("customer_without_subscription", p, null));
    } else {
      rows.push(row("no_stripe_record", p, null));
    }
  }

  // Good-standing subscriptions no paid member claimed.
  const stripeTier = { contributing: 0, founding: 0, other: 0 };
  let stripeGoodStanding = 0;
  for (const s of subs) {
    if (!GOOD_STANDING.has(s.status)) continue;
    stripeGoodStanding++;
    stripeTier[s.tier]++;
    if (consumed.has(s.id)) continue;
    const p = profileByCustomer.get(s.customer) ?? (s.email ? profileByEmail.get(s.email) : undefined) ?? null;
    if (p?.is_admin) rows.push(row("admin_subscription", p, s));
    else if (p) rows.push(row("paid_in_stripe_not_in_db", p, s));
    else rows.push(row("stripe_no_profile", null, s));
  }

  const counts = new Map<ReasonKey, number>();
  for (const r of rows) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);

  const groups = (Object.keys(REASONS) as ReasonKey[])
    .map((key) => {
      const meta = REASONS[key];
      const count = counts.get(key) ?? 0;
      const effect =
        meta.side === "db" ? count : key === "duplicate_subscriptions" ? -duplicateExtras : meta.side === "stripe" ? -count : 0;
      return { key, label: meta.label, description: meta.description, side: meta.side, expected: !!meta.expected, count, effect };
    })
    .filter((g) => g.count > 0);

  const dbPaid = dbPaidProfiles.length;
  const gap = dbPaid - stripeGoodStanding;
  const explained = groups.reduce((sum, g) => sum + g.effect, 0);

  return {
    dbPaid,
    stripeGoodStanding,
    gap,
    byTier: { db: byTierDb, stripe: stripeTier },
    groups,
    explained,
    rows,
  };
}
