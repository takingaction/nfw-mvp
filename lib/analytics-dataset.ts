/**
 * Compact transport for the /admin/analytics dataset.
 *
 * The page used to send every row of profiles (≈26k rows, ≈15 MB, including
 * names, emails, dates of birth and household income) plus the activity
 * tables to the browser as plain objects. This module packs the same data
 * into column arrays with only the fields the dashboard reads:
 *
 * - repeated strings (levels, statuses, states, offer names, cycle ids,
 *   product ids) go in one dictionary and rows store its index;
 * - timestamps are epoch seconds;
 * - user ids are replaced by an index into one user list, so no member uuid
 *   is sent except for upgrade-card candidates (`uid`), whose names and
 *   emails are fetched on demand from /api/admin/analytics/upgrade-members;
 * - names, emails, DOB, income, city and Stripe ids are never sent.
 *
 * `packAnalyticsDataset` runs on the server; `unpackAnalyticsDataset` runs in
 * the browser and returns rows in the shapes the dashboard already uses
 * (ISO timestamp strings, string ids), so its metric code is unchanged.
 */

// Same test accounts the Experience tab excludes (migration 217).
export const EXCLUDED_TEST_EMAILS = ["ronpassaro@gmail.com", "kdrisco2@gmail.com"];

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** Index into PackedAnalyticsDataset.dict, or -1 for null. */
type DictRef = number;
/** Epoch seconds, or -1 for null. */
type Sec = number;
/** Index into the user list, or -1 for null. */
type UserRef = number;

export type PackedAnalyticsDataset = {
  v: 1;
  dict: string[];
  /** Number of users; profiles are users 0..profiles.joined.length-1. */
  userCount: number;
  profiles: {
    joined: Sec[];
    level: DictRef[];
    status: DictRef[];
    endsAt: Sec[];
    firstPaidAt: Sec[];
    firstPaidLevel: DictRef[];
    previousLevel: DictRef[];
    state: DictRef[];
    /** Per profile: approved free, contact submitted, admin, profile completed, test account. 't' | 'f' | 'n' each. */
    flags: string[];
    /** Real uuid, only for profiles that can appear in an upgrade card; otherwise null. */
    uid: (string | null)[];
  };
  payments: { amount: number[]; createdAt: Sec[] };
  upgrades: { user: UserRef[]; from: DictRef[]; to: DictRef[]; createdAt: Sec[] };
  waitlistAcceptances: { user: UserRef[]; usedAt: Sec[] };
  grants: { user: UserRef[]; cycle: DictRef[]; status: DictRef[]; amountApproved: (number | null)[]; submittedAt: Sec[]; fundedAt: Sec[] };
  grantCycles: { id: string; start_date: string | null; end_date: string | null; is_testing_only: boolean | string | null }[];
  /** Access Perks offers: [offer_key, offer_title, store_name] dictionary refs. */
  offers: [DictRef, DictRef, DictRef][];
  redemptions: { user: UserRef[]; offer: number[]; type: DictRef[]; createdAt: Sec[] };
  newsletter: { createdAt: Sec[] };
  zds: { user: UserRef[]; product: DictRef[]; status: DictRef[]; claimedAt: Sec[] };
  nfwPerks: { user: UserRef[]; redeemedAt: Sec[] };
  shopifyProducts: { shopify_product_id: string | null; title: string | null }[];
};

export type AnalyticsProfile = {
  id: string;
  /** Real profile uuid; only set for profiles that can appear in an upgrade card. */
  uid: string | null;
  full_name: string | null;
  email: string | null;
  joined_at: string | null;
  subscription_status: string | null;
  membership_level: string | null;
  subscription_ends_at: string | null;
  first_paid_at: string | null;
  first_paid_level: string | null;
  previous_membership_level: string | null;
  is_approved_free_member: boolean | null;
  free_membership_contact_submitted: boolean | null;
  state: string | null;
  is_admin: boolean | null;
  profile_completed: boolean | null;
  is_test_account: boolean;
};

// Profiles that can appear in an upgrade card (see upgradeGroups in
// AdminAnalyticsClient). Only these keep their uuid, for the on-demand
// name/email lookup.
function isUpgradeCandidate(p: Row): boolean {
  const level = p.membership_level;
  const prev = p.previous_membership_level;
  if ((prev === "free" || prev === "waitlist") && (level === "contributing" || level === "founding" || level === "free")) return true;
  return p.first_paid_level === "contributing" && level === "founding";
}

const toSec = (ts: string | null | undefined): Sec => {
  if (!ts) return -1;
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? -1 : Math.floor(ms / 1000);
};
const fromSec = (s: Sec): string | null => (s < 0 ? null : new Date(s * 1000).toISOString());
const flagChar = (b: unknown) => (b === true ? "t" : b === false ? "f" : "n");
const charFlag = (c: string): boolean | null => (c === "t" ? true : c === "f" ? false : null);

export function packAnalyticsDataset(input: {
  profiles: Row[];
  membershipPayments: Row[];
  membershipUpgrades: Row[];
  waitlistAcceptances: Row[];
  grants: Row[];
  grantCycles: Row[];
  redemptions: Row[];
  newsletterEmails: Row[];
  zdsClaims: Row[];
  nfwPerkRedemptions: Row[];
  shopifyProducts: Row[];
}): PackedAnalyticsDataset {
  const dict: string[] = [];
  const dictIndex = new Map<string, number>();
  const d = (value: unknown): DictRef => {
    if (value === null || value === undefined) return -1;
    const s = String(value);
    let i = dictIndex.get(s);
    if (i === undefined) {
      i = dict.length;
      dict.push(s);
      dictIndex.set(s, i);
    }
    return i;
  };

  const userIndex = new Map<string, number>();
  input.profiles.forEach((p, i) => userIndex.set(p.id, i));
  let userCount = input.profiles.length;
  // Activity rows whose profile no longer exists still get their own user.
  const u = (id: string | null | undefined): UserRef => {
    if (!id) return -1;
    let i = userIndex.get(id);
    if (i === undefined) {
      i = userCount++;
      userIndex.set(id, i);
    }
    return i;
  };

  const profiles: PackedAnalyticsDataset["profiles"] = {
    joined: [], level: [], status: [], endsAt: [], firstPaidAt: [], firstPaidLevel: [],
    previousLevel: [], state: [], flags: [], uid: [],
  };
  for (const p of input.profiles) {
    profiles.joined.push(toSec(p.joined_at));
    profiles.level.push(d(p.membership_level));
    profiles.status.push(d(p.subscription_status));
    profiles.endsAt.push(toSec(p.subscription_ends_at));
    profiles.firstPaidAt.push(toSec(p.first_paid_at));
    profiles.firstPaidLevel.push(d(p.first_paid_level));
    profiles.previousLevel.push(d(p.previous_membership_level));
    profiles.state.push(d(p.state));
    const isTest = EXCLUDED_TEST_EMAILS.includes(String(p.email ?? "").toLowerCase());
    profiles.flags.push(
      flagChar(p.is_approved_free_member) +
        flagChar(p.free_membership_contact_submitted) +
        flagChar(p.is_admin) +
        flagChar(p.profile_completed) +
        flagChar(isTest),
    );
    profiles.uid.push(isUpgradeCandidate(p) ? p.id : null);
  }

  const offerIndex = new Map<string, number>();
  const offers: PackedAnalyticsDataset["offers"] = [];
  const offerRef = (r: Row) => {
    const key = `${r.offer_key ?? ""}\u0000${r.offer_title ?? ""}\u0000${r.store_name ?? ""}`;
    let i = offerIndex.get(key);
    if (i === undefined) {
      i = offers.length;
      offers.push([d(r.offer_key), d(r.offer_title), d(r.store_name)]);
      offerIndex.set(key, i);
    }
    return i;
  };

  const packed: Omit<PackedAnalyticsDataset, "userCount"> = {
    v: 1,
    dict,
    profiles,
    payments: {
      amount: input.membershipPayments.map((p) => Number(p.amount ?? 0)),
      createdAt: input.membershipPayments.map((p) => toSec(p.created_at)),
    },
    upgrades: {
      user: input.membershipUpgrades.map((x) => u(x.user_id)),
      from: input.membershipUpgrades.map((x) => d(x.from_level)),
      to: input.membershipUpgrades.map((x) => d(x.to_level)),
      createdAt: input.membershipUpgrades.map((x) => toSec(x.created_at)),
    },
    waitlistAcceptances: {
      user: input.waitlistAcceptances.map((x) => u(x.user_id)),
      usedAt: input.waitlistAcceptances.map((x) => toSec(x.used_at)),
    },
    grants: {
      user: input.grants.map((g) => u(g.user_id)),
      cycle: input.grants.map((g) => d(g.cycle_id)),
      status: input.grants.map((g) => d(g.status)),
      amountApproved: input.grants.map((g) => (g.amount_approved === null || g.amount_approved === undefined ? null : Number(g.amount_approved))),
      submittedAt: input.grants.map((g) => toSec(g.submitted_at)),
      fundedAt: input.grants.map((g) => toSec(g.funded_at)),
    },
    grantCycles: input.grantCycles.map((c) => ({
      id: c.id,
      start_date: c.start_date ?? null,
      end_date: c.end_date ?? null,
      is_testing_only: c.is_testing_only ?? null,
    })),
    offers,
    redemptions: {
      user: input.redemptions.map((r) => u(r.user_id)),
      offer: input.redemptions.map((r) => offerRef(r)),
      type: input.redemptions.map((r) => d(r.redeem_type)),
      createdAt: input.redemptions.map((r) => toSec(r.created_at)),
    },
    newsletter: { createdAt: input.newsletterEmails.map((e) => toSec(e.created_at)) },
    zds: {
      user: input.zdsClaims.map((c) => u(c.user_id)),
      product: input.zdsClaims.map((c) => d(c.shopify_product_id)),
      status: input.zdsClaims.map((c) => d(c.status)),
      claimedAt: input.zdsClaims.map((c) => toSec(c.claimed_at)),
    },
    nfwPerks: {
      user: input.nfwPerkRedemptions.map((r) => u(r.user_id)),
      redeemedAt: input.nfwPerkRedemptions.map((r) => toSec(r.redeemed_at)),
    },
    shopifyProducts: input.shopifyProducts.map((p) => ({
      shopify_product_id: p.shopify_product_id ?? null,
      title: p.title ?? null,
    })),
  };
  // userCount is final only after every activity table has been indexed.
  return { ...packed, userCount };
}

export function unpackAnalyticsDataset(ds: PackedAnalyticsDataset) {
  const s = (i: DictRef): string | null => (i < 0 ? null : ds.dict[i]);
  const uid = (i: UserRef): string | null => (i < 0 ? null : `u${i}`);
  const P = ds.profiles;

  const profiles: AnalyticsProfile[] = P.joined.map((_, i) => {
    const f = P.flags[i];
    return {
      id: `u${i}`,
      uid: P.uid[i],
      full_name: null,
      email: null,
      joined_at: fromSec(P.joined[i]),
      subscription_status: s(P.status[i]),
      membership_level: s(P.level[i]),
      subscription_ends_at: fromSec(P.endsAt[i]),
      first_paid_at: fromSec(P.firstPaidAt[i]),
      first_paid_level: s(P.firstPaidLevel[i]),
      previous_membership_level: s(P.previousLevel[i]),
      state: s(P.state[i]),
      is_approved_free_member: charFlag(f[0]),
      free_membership_contact_submitted: charFlag(f[1]),
      is_admin: charFlag(f[2]),
      profile_completed: charFlag(f[3]),
      is_test_account: f[4] === "t",
    };
  });

  return {
    profiles,
    membershipPayments: ds.payments.amount.map((amount, i) => ({
      id: String(i),
      user_id: null,
      amount,
      payment_type: null,
      created_at: fromSec(ds.payments.createdAt[i]),
    })),
    membershipUpgrades: ds.upgrades.user.map((user, i) => ({
      id: String(i),
      user_id: uid(user),
      from_level: s(ds.upgrades.from[i]),
      to_level: s(ds.upgrades.to[i]),
      amount: null,
      created_at: fromSec(ds.upgrades.createdAt[i]),
    })),
    waitlistAcceptances: ds.waitlistAcceptances.user.map((user, i) => ({
      id: String(i),
      user_id: uid(user),
      used_at: fromSec(ds.waitlistAcceptances.usedAt[i]),
    })),
    grants: ds.grants.user.map((user, i) => ({
      id: String(i),
      user_id: uid(user),
      cycle_id: s(ds.grants.cycle[i]) ?? "",
      status: s(ds.grants.status[i]),
      amount_approved: ds.grants.amountApproved[i],
      submitted_at: fromSec(ds.grants.submittedAt[i]),
      funded_at: fromSec(ds.grants.fundedAt[i]),
    })),
    grantCycles: ds.grantCycles,
    redemptions: ds.redemptions.user.map((user, i) => {
      const [key, title, store] = ds.offers[ds.redemptions.offer[i]];
      return {
        id: String(i),
        user_id: uid(user),
        offer_key: s(key),
        offer_title: s(title),
        store_name: s(store),
        redeem_type: s(ds.redemptions.type[i]),
        created_at: fromSec(ds.redemptions.createdAt[i]),
      };
    }),
    newsletterEmails: ds.newsletter.createdAt.map((t, i) => ({ id: String(i), created_at: fromSec(t) })),
    zdsClaims: ds.zds.user.map((user, i) => ({
      id: String(i),
      user_id: uid(user),
      shopify_product_id: s(ds.zds.product[i]),
      status: s(ds.zds.status[i]),
      claimed_at: fromSec(ds.zds.claimedAt[i]),
    })),
    nfwPerkRedemptions: ds.nfwPerks.user.map((user, i) => ({
      id: String(i),
      user_id: uid(user),
      perk_id: null,
      redeemed_at: fromSec(ds.nfwPerks.redeemedAt[i]),
    })),
    shopifyProducts: ds.shopifyProducts,
  };
}
