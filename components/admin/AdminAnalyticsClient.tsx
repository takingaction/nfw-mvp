"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import MemberExperienceTab from "@/components/admin/MemberExperienceTab";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  FileText,
  Users,
  DollarSign,
  Gift,
  TrendingUp,
  Calendar,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";
import { getCategory } from "@/lib/member-categories";
import {
  unpackAnalyticsDataset,
  type AnalyticsProfile,
  type PackedAnalyticsDataset,
} from "@/lib/analytics-dataset";
import { parseSiteDate, siteEndOfDay, startOfCurrentPeriod, parseJoinedAt, formatJoinedAtFull, siteDateKey, SITE_TZ } from "@/lib/dates";

type DateRangeOption = {
  label: string;
  value: number | "custom";
  description?: string;
};

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { label: "All Time", value: 9999, description: "Everything" },
  { label: "Today", value: 1, description: "Current day" },
  { label: "Last 7 Days", value: 7, description: "Past week" },
  { label: "Last 30 Days", value: 30, description: "Past month" },
  { label: "Month to Date", value: -1, description: "Current month" },
  { label: "Last 90 Days", value: 90, description: "Past 3 months" },
  { label: "Quarter to Date", value: -2, description: "Current quarter" },
  { label: "Last 6 Months", value: 180, description: "Past 6 months" },
  { label: "Year to Date", value: -3, description: "Current year" },
  { label: "Last 12 Months", value: 365, description: "Past year" },
  { label: "Custom Range", value: "custom", description: "Choose dates" },
];

// Profiles arrive without names or emails (see lib/analytics-dataset.ts);
// the upgrade list fetches those on demand.
type Profile = AnalyticsProfile;

type Grant = {
  id: string;
  user_id: string | null;
  cycle_id: string;
  status: string | null;
  amount_approved: number | null;
  submitted_at: string | null;
  funded_at: string | null;
};

type Redemption = {
  id: string;
  user_id: string | null;
  offer_key: string | null;
  offer_title: string | null;
  store_name: string | null;
  redeem_type: string | null;
  created_at: string | null;
};

// Same definitions as the Experience tab (migration 217).
const APPROVED_GRANT_STATUSES = ["approved", "payment_pending", "payment_sent"];
const SUCCESSFUL_ZDS_STATUSES = ["completed", "fulfilled"];

type DailyPoint = { key: string; date: string; dateFull: string; count: number };

// Counts per Pacific calendar day, labelled the same way as the Members chart
// (year added when the range spans more than one year).
function buildDailySeries(timestamps: string[]): DailyPoint[] {
  const counts: Record<string, number> = {};
  const sample: Record<string, string> = {};
  for (const ts of timestamps) {
    const key = siteDateKey(ts);
    counts[key] = (counts[key] || 0) + 1;
    if (!sample[key]) sample[key] = ts;
  }
  const keys = Object.keys(counts).sort();
  const spansMultipleYears = keys.length > 0 && keys[0].slice(0, 4) !== keys[keys.length - 1].slice(0, 4);
  return keys.map((key) => {
    const label = parseJoinedAt(sample[key]);
    return {
      key,
      date: spansMultipleYears ? `${label} '${key.slice(2, 4)}` : label,
      dateFull: formatJoinedAtFull(sample[key]),
      count: counts[key],
    };
  });
}

const dailyTooltipLabel = (label: unknown, payload: readonly { payload?: { dateFull?: string } }[] | undefined) =>
  payload?.[0]?.payload?.dateFull || String(label);

const COLORS = [
  "#3E145F",
  "#7786BE",
  "#B693C0",
  "#2E1F38",
  "#5a3d7a",
  "#9580b4",
];

const PIE_COLORS: Record<string, string> = {
  Admin: "#3E145F",
  Founding: "#5a3d7a",
  Contributing: "#9580b4",
  Waitlist: "#9CA3AF",
  Cancelled: "#4B5563",
  Abandoned: "#6B7280",
  "Profile Incomplete": "#D1D5DB",
  Free: "#B693C0",
  Other: "#E5E7EB",
};

type NewsletterEmail = {
  id: string;
  created_at: string | null;
};

type ZdsClaim = {
  id: string;
  user_id: string | null;
  shopify_product_id: string | null;
  status: string | null;
  claimed_at: string | null;
};

type ShopifyProduct = {
  shopify_product_id: string | null;
  title: string | null;
};

type NfwPerkRedemption = {
  id: string;
  user_id: string | null;
  perk_id: string | null;
  redeemed_at: string | null;
};

type MembershipPayment = {
  id: string;
  user_id: string | null;
  amount: number | null;
  payment_type: string | null;
  created_at: string | null;
};

type MembershipUpgrade = {
  id: string;
  user_id: string | null;
  from_level: string | null;
  to_level: string | null;
  amount: number | null;
  created_at: string | null;
};

type WaitlistAcceptance = {
  id: string;
  user_id: string | null;
  used_at: string | null;
};

type GrantCycle = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  is_testing_only: boolean | string | null;
};

type UpgradeGroupKey =
  | "free_to_contributing"
  | "free_to_founding"
  | "waitlist_to_contributing"
  | "waitlist_to_founding"
  | "waitlist_to_free"
  | "contributing_to_founding";

type UpgradeMember = {
  profile: Profile;
  upgradedAt: string | null;
};

type UpgradeGroup = {
  key: UpgradeGroupKey;
  label: string;
  members: UpgradeMember[];
};

// UTC-safe MM/DD/YYYY (matches /admin/members and /admin/waitlist)
function formatUtcDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getUTCFullYear()}`;
}

function escapeCsvField(value: string | null | undefined): string {
  const s = value ?? "";
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Entry point: unpacks the compact dataset sent by the page (no member
 * names, emails or other personal details) into the row shapes the
 * dashboard works with.
 */
export default function AdminAnalyticsClient({ dataset }: { dataset: PackedAnalyticsDataset }) {
  const data = useMemo(() => unpackAnalyticsDataset(dataset), [dataset]);
  return <AnalyticsDashboard {...data} />;
}

type MemberContact = { full_name: string | null; email: string | null };

function AnalyticsDashboard({
  profiles,
  grants,
  grantCycles,
  redemptions,
  newsletterEmails,
  zdsClaims,
  shopifyProducts,
  nfwPerkRedemptions,
  membershipPayments,
  membershipUpgrades,
  waitlistAcceptances,
}: {
  profiles: Profile[];
  grants: Grant[];
  grantCycles: GrantCycle[];
  redemptions: Redemption[];
  newsletterEmails: NewsletterEmail[];
  zdsClaims: ZdsClaim[];
  shopifyProducts: ShopifyProduct[];
  nfwPerkRedemptions: NfwPerkRedemption[];
  membershipPayments: MembershipPayment[];
  membershipUpgrades: MembershipUpgrade[];
  waitlistAcceptances: WaitlistAcceptance[];
}) {
  const [tab, setTab] = useState<"members" | "grants" | "perks" | "zds" | "engagement" | "cohorts" | "experience" | "support">("members");
  const [dateRange, setDateRange] = useState<number | "custom">(9999);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [expandedUpgrade, setExpandedUpgrade] = useState<UpgradeGroupKey | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  // Names and emails for upgrade-card members, keyed by profile uuid, loaded
  // when a card is opened.
  const [memberContacts, setMemberContacts] = useState<Record<string, MemberContact>>({});
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [freshdeskStats, setFreshdeskStats] = useState<{
    total: number;
    open: number;
    pending: number;
    resolved: number;
    closed: number;
    truncated?: boolean;
    fetchedAt?: string;
  } | null>(null);
  const [freshdeskLoading, setFreshdeskLoading] = useState(false);
  const [freshdeskError, setFreshdeskError] = useState<string | null>(null);
  // Bumped by the Retry button to re-run the Freshdesk fetch.
  const [freshdeskReload, setFreshdeskReload] = useState(0);

  // Stripe live stats
  const [stripeLiveStats, setStripeLiveStats] = useState<{
    contributing: { count: number; revenue: number };
    founding: { count: number; revenue: number };
    total: { count: number; revenue: number };
  } | null>(null);

  const dashboardRef = useRef<HTMLDivElement>(null);

  // Fetch Stripe live stats on mount
  useEffect(() => {
    fetch("/api/admin/backfill/stripe/stripe-live")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        if (data.stripeLive?.contributing && data.stripeLive?.founding && data.stripeLive?.total) {
          setStripeLiveStats(data.stripeLive);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch Stripe live stats:", err);
      });
  }, []);

  // Fetch Freshdesk stats when support tab is active or date range changes
  useEffect(() => {
    if (tab !== "support") return;

    // A newer range (or leaving the tab) supersedes this request; its result
    // is ignored instead of overwriting newer data.
    let cancelled = false;
    setFreshdeskLoading(true);
    setFreshdeskError(null);

    // Calculate actual start date for Freshdesk API
    // Freshdesk uses updated_since for date filtering
    const params = new URLSearchParams();
    const now = new Date();

    // Freshdesk accepts full ISO timestamps; send exact Pacific-time
    // boundaries as UTC instants (seconds precision).
    const toFreshdesk = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

    if (dateRange === "custom") {
      // Custom range: 12:00 AM PT on start date through 11:59:59 PM PT on end date
      if (customStartDate) params.set("start_date", toFreshdesk(parseSiteDate(customStartDate)));
      if (customEndDate) params.set("end_date", toFreshdesk(siteEndOfDay(customEndDate)));
    } else if (dateRange !== 9999) {
      let startDate: Date;

      if (dateRange === -1) {
        // Month to date - start of current month (PT)
        startDate = startOfCurrentPeriod("month");
      } else if (dateRange === -2) {
        // Quarter to date - start of current quarter (PT)
        startDate = startOfCurrentPeriod("quarter");
      } else if (dateRange === -3) {
        // Year to date - start of current year (PT)
        startDate = startOfCurrentPeriod("year");
      } else {
        // Regular day offset (7, 30, 90, 180, 365)
        startDate = new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000);
      }

      params.set("start_date", toFreshdesk(startDate));
    }
    // For 9999 (All Time), don't send any date params

    const queryString = params.toString();

    fetch(`/api/admin/analytics/freshdesk${queryString ? `?${queryString}` : ""}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Failed to fetch Freshdesk stats");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setFreshdeskStats(data);
        setFreshdeskLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setFreshdeskError(err.message);
        setFreshdeskLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, dateRange, customStartDate, customEndDate, freshdeskReload]);

  // Calculate cutoff based on selected date range
  const cutoff = useMemo(() => {
    const now = new Date();

    if (dateRange === 9999) {
      // All time - return epoch
      return new Date(0);
    }

    if (dateRange === "custom") {
      if (!customStartDate) return new Date(0);
      return parseSiteDate(customStartDate);
    }

    if (dateRange === -1 || dateRange === -2 || dateRange === -3) {
      const period = dateRange === -1 ? 'month' : dateRange === -2 ? 'quarter' : 'year';
      return startOfCurrentPeriod(period);
    }

    // Regular day offset
    return new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000);
  }, [dateRange, customStartDate]);

  // Get end date for custom range (end of end date day, Pacific time)
  const endDate = useMemo(() => {
    if (dateRange !== "custom" || !customEndDate) return new Date();
    return siteEndOfDay(customEndDate);
  }, [dateRange, customEndDate]);

  // Helper to check if a date is within range
  const isInRange = useMemo(() => {
    return (dateStr: string | null | undefined): boolean => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      if (dateRange === "custom") {
        return date >= cutoff && date <= endDate;
      }
      return date >= cutoff;
    };
  }, [cutoff, endDate, dateRange]);

  // Admins and test accounts: their activity is testing, not member use.
  // Same exclusions as the Experience tab.
  const excludedUserIds = useMemo(
    () =>
      new Set(
        profiles
          .filter((p) => p.is_admin || p.is_test_account)
          .map((p) => p.id),
      ),
    [profiles],
  );
  const isMemberActivity = useCallback(
    (userId: string | null) => !!userId && !excludedUserIds.has(userId),
    [excludedUserIds],
  );

  // Access Perks redemptions, one per member, offer and Pacific day: repeat
  // clicks on the same offer the same day are one redemption (Experience tab
  // definition). Earliest click wins.
  const memberRedemptions = useMemo(() => {
    const seen = new Set<string>();
    return [...redemptions]
      .filter((r) => r.created_at && isMemberActivity(r.user_id))
      .sort((a, b) => (a.created_at! < b.created_at! ? -1 : a.created_at! > b.created_at! ? 1 : 0))
      .filter((r) => {
        const k = `${r.user_id}|${r.offer_key}|${siteDateKey(r.created_at!)}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  }, [redemptions, isMemberActivity]);

  // ── MEMBERS ──────────────────────────────────────────────
  const filteredProfiles = useMemo(
    () =>
      profiles.filter((p) => p.joined_at && isInRange(p.joined_at)),
    [profiles, isInRange],
  );

  const membersByDay = useMemo(() => {
    // Two series on one date axis (Pacific calendar day, "YYYY-MM-DD"):
    //  - started: every profile created that day (joined_at), all tiers incl. admins/test accounts
    //  - paid:    non-admin profiles whose FIRST payment landed that day (first_paid_at).
    //             Uses first_paid_at so free→paid upgraders count on the day they converted,
    //             and members who later lapsed still count in history.
    const started: Record<string, number> = {};
    const paid: Record<string, number> = {};
    const sampleTimestamp: Record<string, string> = {};

    filteredProfiles.forEach((p) => {
      const key = siteDateKey(p.joined_at!);
      started[key] = (started[key] || 0) + 1;
      if (!sampleTimestamp[key]) sampleTimestamp[key] = p.joined_at!;
    });

    profiles.forEach((p) => {
      if (p.is_admin || !p.first_paid_at || !isInRange(p.first_paid_at)) return;
      const key = siteDateKey(p.first_paid_at);
      paid[key] = (paid[key] || 0) + 1;
      if (!sampleTimestamp[key]) sampleTimestamp[key] = p.first_paid_at;
    });

    const keys = Array.from(
      new Set([...Object.keys(started), ...Object.keys(paid)]),
    ).sort();
    const spansMultipleYears =
      keys.length > 0 && keys[0].slice(0, 4) !== keys[keys.length - 1].slice(0, 4);
    return keys.map((key) => {
      const label = parseJoinedAt(sampleTimestamp[key]);
      return {
        key,
        date: spansMultipleYears ? `${label} '${key.slice(2, 4)}` : label,
        dateFull: formatJoinedAtFull(sampleTimestamp[key]),
        started: started[key] || 0,
        paid: paid[key] || 0,
      };
    });
  }, [filteredProfiles, profiles, isInRange]);

  const membersByLevel = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProfiles.forEach((p) => {
      const level = getCategory(p as Record<string, unknown>);
      map[level] = (map[level] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredProfiles]);

  const membersByState = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProfiles.forEach((p) => {
      if (p.state) map[p.state] = (map[p.state] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([state, count]) => ({ state, count }));
  }, [filteredProfiles]);

  const contributingCount = useMemo(() => {
    return filteredProfiles.filter(
      (p) => p.is_admin !== true && p.membership_level === "contributing"
    ).length;
  }, [filteredProfiles]);

  const foundingCount = useMemo(() => {
    return filteredProfiles.filter(
      (p) => p.is_admin !== true && p.membership_level === "founding"
    ).length;
  }, [filteredProfiles]);




  // Upgrade stats - members who upgraded from one tier to another.
  // Excludes admins, incomplete profiles, and (for free→paid) abandoned profiles.
  // Each group holds the actual member list so the card count and the
  // expandable list below the cards can never drift apart.
  const upgradeGroups = useMemo<UpgradeGroup[]>(() => {
    const eligible = filteredProfiles.filter(
      (p) => !p.is_admin && p.profile_completed === true
    );

    // contributing → founding upgrade dates come from membership_upgrades
    const upgradeDateByUser = new Map<string, string>();
    for (const u of membershipUpgrades || []) {
      if (!u.user_id || !u.created_at) continue;
      if (u.from_level !== "contributing" || u.to_level !== "founding") continue;
      const existing = upgradeDateByUser.get(u.user_id);
      if (!existing || new Date(u.created_at) > new Date(existing)) {
        upgradeDateByUser.set(u.user_id, u.created_at);
      }
    }

    // waitlist → free upgrade dates come from waitlist_acceptance_tokens.used_at
    // (when the member clicked the approval link). Latest acceptance wins.
    const waitlistAcceptedByUser = new Map<string, string>();
    for (const t of waitlistAcceptances || []) {
      if (!t.user_id || !t.used_at) continue;
      const existing = waitlistAcceptedByUser.get(t.user_id);
      if (!existing || new Date(t.used_at) > new Date(existing)) {
        waitlistAcceptedByUser.set(t.user_id, t.used_at);
      }
    }

    const build = (
      key: UpgradeGroupKey,
      label: string,
      predicate: (p: Profile) => boolean,
      upgradedAt: (p: Profile) => string | null
    ): UpgradeGroup => ({
      key,
      label,
      members: eligible
        .filter(predicate)
        .map((profile) => ({ profile, upgradedAt: upgradedAt(profile) }))
        .sort((a, b) => {
          const ta = a.upgradedAt ? new Date(a.upgradedAt).getTime() : 0;
          const tb = b.upgradedAt ? new Date(b.upgradedAt).getTime() : 0;
          return tb - ta;
        }),
    });

    const firstPaid = (p: Profile) => p.first_paid_at;

    return [
      build(
        "free_to_contributing",
        "free → contributing",
        (p) =>
          p.free_membership_contact_submitted === true && // excludes abandoned
          p.previous_membership_level === "free" &&
          p.membership_level === "contributing",
        firstPaid
      ),
      build(
        "free_to_founding",
        "free → founding",
        (p) =>
          p.free_membership_contact_submitted === true && // excludes abandoned
          p.previous_membership_level === "free" &&
          p.membership_level === "founding",
        firstPaid
      ),
      build(
        "waitlist_to_contributing",
        "waitlist → contributing",
        (p) => p.previous_membership_level === "waitlist" && p.membership_level === "contributing",
        firstPaid
      ),
      build(
        "waitlist_to_founding",
        "waitlist → founding",
        (p) => p.previous_membership_level === "waitlist" && p.membership_level === "founding",
        firstPaid
      ),
      build(
        "waitlist_to_free",
        "waitlist → free",
        (p) => p.previous_membership_level === "waitlist" && p.membership_level === "free",
        // Accepted-link date; falls back to join date for members approved
        // before acceptance tokens existed (old immediate-approval flow).
        (p) => waitlistAcceptedByUser.get(p.id) ?? p.joined_at
      ),
      build(
        "contributing_to_founding",
        "contributing → founding",
        (p) => p.first_paid_level === "contributing" && p.membership_level === "founding",
        (p) => upgradeDateByUser.get(p.id) ?? null
      ),
    ];
  }, [filteredProfiles, membershipUpgrades, waitlistAcceptances]);

  const expandedUpgradeGroup = useMemo(
    () => upgradeGroups.find((g) => g.key === expandedUpgrade) ?? null,
    [upgradeGroups, expandedUpgrade]
  );

  // Fetch names and emails for the open card's members that aren't loaded yet.
  useEffect(() => {
    if (!expandedUpgradeGroup) return;
    const missing = expandedUpgradeGroup.members
      .map(({ profile }) => profile.uid)
      .filter((id): id is string => !!id && !(id in memberContacts));
    if (missing.length === 0) return;

    let cancelled = false;
    setContactsLoading(true);
    setContactsError(null);
    fetch("/api/admin/analytics/upgrade-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: missing }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Failed to load member names and emails");
        return json.members as Record<string, MemberContact>;
      })
      .then((members) => {
        if (cancelled) return;
        // Record misses too, so a deleted profile isn't requested again.
        const merged: Record<string, MemberContact> = {};
        for (const id of missing) merged[id] = members[id] ?? { full_name: null, email: null };
        setMemberContacts((prev) => ({ ...prev, ...merged }));
        setContactsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setContactsError(err.message);
        setContactsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // memberContacts is read only to skip loaded ids; refetching when it
    // changes would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedUpgradeGroup]);

  const contactOf = (profile: Profile): MemberContact =>
    (profile.uid && memberContacts[profile.uid]) || { full_name: null, email: null };

  const copyUpgradeEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  const exportUpgradeGroupCSV = (group: UpgradeGroup) => {
    const rows: string[][] = [
      ["Name", "Email", "Joined", "Upgraded"],
      ...group.members.map(({ profile, upgradedAt }) => [
        contactOf(profile).full_name ?? "",
        contactOf(profile).email ?? "",
        formatUtcDate(profile.joined_at),
        formatUtcDate(upgradedAt),
      ]),
    ];
    const csv = rows.map((r) => r.map(escapeCsvField).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nfw-upgrades-${group.key}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };


  // Membership revenue (annual)
  const membershipRevenue = useMemo(() => {
    return contributingCount * 15 + foundingCount * 100;
  }, [contributingCount, foundingCount]);

  // Verified revenue from membership_payments table (actual Stripe data)
  // Defensive: filter out $0 adjustment invoices. Stripe emits $0 paid
  // invoices for period reconciliations and payment-method retries; they
  // should never count as revenue. Belt-and-suspenders alongside the
  // server-side guards in lib/stripe-payments.ts.
  const verifiedPeriodRevenue = useMemo(() => {
    if (!membershipPayments || membershipPayments.length === 0) return 0;
    return membershipPayments
      .filter((p) => (p.amount ?? 0) > 0)
      .filter((p) => {
        if (!p.created_at) return false;
        const paymentDate = new Date(p.created_at);
        return paymentDate >= cutoff && paymentDate <= endDate;
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [membershipPayments, cutoff, endDate]);

  // Verified lifetime revenue from membership_payments table (actual Stripe data)
  const verifiedLifetimeRevenue = useMemo(() => {
    if (!membershipPayments || membershipPayments.length === 0) return 0;
    return membershipPayments
      .filter((p) => (p.amount ?? 0) > 0)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [membershipPayments]);


  // Waterfall categories (mutually exclusive)
  // Admin count (separate, not in other categories)
  const adminCount = useMemo(() => {
    return filteredProfiles.filter((p) => p.is_admin === true).length;
  }, [filteredProfiles]);

  // Paid members (non-admin, contributing or founding) - for waterfall breakdown
  const paidMembersCount = useMemo(() => {
    return filteredProfiles.filter(
      (p) =>
        p.is_admin !== true &&
        (p.membership_level === "contributing" || p.membership_level === "founding")
    ).length;
  }, [filteredProfiles]);

  // Free members (approved, non-admin, completed profile)
  const freeMembersCount = useMemo(() => {
    return filteredProfiles.filter(
      (p) =>
        p.is_admin !== true &&
        p.membership_level === "free" &&
        p.is_approved_free_member === true &&
        p.profile_completed === true
    ).length;
  }, [filteredProfiles]);

  // Average membership dues per total legitimate member (paid + approved free)
  const averageDues = useMemo(() => {
    const denominator = paidMembersCount + freeMembersCount;
    if (denominator === 0) return 0;
    return Math.round(membershipRevenue / denominator);
  }, [membershipRevenue, paidMembersCount, freeMembersCount]);

  // Waitlist members
  const waitlistCount = useMemo(() => {
    return filteredProfiles.filter((p) => p.membership_level === "waitlist").length;
  }, [filteredProfiles]);

  // Active Profiles = Free (approved) + Contributing + Founding (excludes admins, waitlist, incomplete)
  const activeProfilesCount = useMemo(() => {
    return filteredProfiles.filter(
      (p) => {
        if (p.is_admin) return false;
        if (p.membership_level === "free") {
          return p.is_approved_free_member === true && p.profile_completed === true;
        }
        // Contributing and Founding don't need profile_completed check
        if (p.membership_level === "contributing" || p.membership_level === "founding") {
          return true;
        }
        return false;
      }
    ).length;
  }, [filteredProfiles]);


  // Abandoned = free member who completed profile but abandoned at step 3
  const abandonedCount = useMemo(() => {
    return filteredProfiles.filter(
      (p) =>
        p.membership_level === "free" &&
        p.profile_completed === true &&
        p.is_approved_free_member !== true &&
        p.free_membership_contact_submitted === false
    ).length;
  }, [filteredProfiles]);

  // Profile Incomplete = free member who never finished profile
  const profileIncompleteCount = useMemo(() => {
    return filteredProfiles.filter(
      (p) =>
        p.profile_completed !== true
    ).length;
  }, [filteredProfiles]);

  // Paid vs free: share of current members who joined in the period (paid,
  // or approved free; no admins or test accounts). The two add up to 100%.
  const { paidPercent, freePercent } = useMemo(() => {
    let paid = 0;
    let free = 0;
    for (const p of filteredProfiles) {
      if (excludedUserIds.has(p.id)) continue;
      if (p.membership_level === "contributing" || p.membership_level === "founding") paid++;
      else if (p.membership_level === "free" && p.is_approved_free_member === true) free++;
    }
    const total = paid + free;
    if (total === 0) return { paidPercent: 0, freePercent: 0 };
    const paidPct = Math.round((paid / total) * 100);
    return { paidPercent: paidPct, freePercent: 100 - paidPct };
  }, [filteredProfiles, excludedUserIds]);

  // Retention rate: members who joined 12+ months ago and are still active.
  // null until anyone has been a member for 12 months (shown as "—", not 0%).
  const retentionRate = useMemo<number | null>(() => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const oldMembers = profiles.filter((p) => {
      if (p.is_admin || !p.joined_at) return false;
      // Cancelled members were members who didn't stay, so they count.
      if (!["free", "contributing", "founding", "cancelled"].includes(p.membership_level ?? "")) return false;
      return new Date(p.joined_at) <= twelveMonthsAgo;
    });

    if (oldMembers.length === 0) return null;

    const retainedMembers = oldMembers.filter((p) => {
      // Still active if: paid with active status OR free with approved status
      if (p.membership_level === "free") {
        return p.is_approved_free_member === true;
      }
      return p.subscription_status === "active";
    });

    return Math.round((retainedMembers.length / oldMembers.length) * 100);
  }, [profiles]);

  // Churn: paid subscriptions that actually ended in the period.
  // subscription_ends_at is also the current period end for active and
  // canceling members, so only end dates already in the past count, and never
  // for members whose subscription is still active.
  const churnCount = useMemo(() => {
    const now = new Date();
    return profiles.filter((p) => {
      if (p.is_admin || !p.subscription_ends_at) return false;
      if (p.subscription_status === "active") return false;
      const ended = new Date(p.subscription_ends_at);
      return ended <= now && isInRange(p.subscription_ends_at);
    }).length;
  }, [profiles, isInRange]);

  // Churn rate = churned / members who had paid by the end of the period.
  const churnRate = useMemo(() => {
    const periodEnd = endDate;
    const paidByEnd = profiles.filter(
      (p) => !p.is_admin && p.first_paid_at && new Date(p.first_paid_at) <= periodEnd,
    ).length;
    return paidByEnd > 0 ? Math.round((churnCount / paidByEnd) * 1000) / 10 : 0;
  }, [profiles, churnCount, endDate]);

  // All-time paid members (non-admin), for comparing against Stripe's live
  // count. Stripe's count isn't date-filtered, so this one mustn't be either.
  const paidMembersAllTime = useMemo(
    () =>
      profiles.filter(
        (p) => !p.is_admin && (p.membership_level === "contributing" || p.membership_level === "founding"),
      ).length,
    [profiles],
  );

  // Newsletter signups (filtered by period)
  const filteredNewsletterSignups = useMemo(() => {
    return newsletterEmails.filter((e) => e.created_at && isInRange(e.created_at));
  }, [newsletterEmails, isInRange]);

  // Combined: new member signups + newsletter signups in period
  const combinedSignups = useMemo(() => {
    return filteredProfiles.length + filteredNewsletterSignups.length;
  }, [filteredProfiles, filteredNewsletterSignups]);

  // Total newsletter subscribers (filtered by period)
  const totalNewsletterSubscribers = filteredNewsletterSignups.length;

  // ── GRANTS ───────────────────────────────────────────────
  // Build lookup map: cycle_id -> is_testing_only (checks both boolean and string from Supabase)
  const cycleTestingMap = useMemo(() => {
    const map = new Map<string, boolean>();
    grantCycles.forEach((c) => {
      if (c.id && c.is_testing_only !== undefined && c.is_testing_only !== null) {
        map.set(c.id, c.is_testing_only === true || c.is_testing_only === "true");
      }
    });
    return map;
  }, [grantCycles]);


  const filteredGrants = useMemo(
    () =>
      grants.filter(
        (g) =>
          g.submitted_at &&
          isInRange(g.submitted_at) &&
          cycleTestingMap.get(g.cycle_id) !== true &&
          isMemberActivity(g.user_id),
      ),
    [grants, isInRange, cycleTestingMap, isMemberActivity],
  );

  const grantsByDay = useMemo(
    () => buildDailySeries(filteredGrants.map((x) => x.submitted_at!)),
    [filteredGrants],
  );

  const grantsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filteredGrants.forEach((g) => {
      let s = g.status || "unknown";
      // Map status values to display names
      if (s === "approved") s = "Approved";
      else if (s === "not_approved") s = "Not Approved";
      else if (s === "payment_pending") s = "Payment Pending";
      else if (s === "payment_sent") s = "Payment Sent";
      else if (s === "submitted") s = "Submitted";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredGrants]);

  // Disbursed is dated by when the money went out (funded_at), not when the
  // application was submitted.
  const totalFunded = useMemo(
    () =>
      grants
        .filter(
          (g) =>
            g.status === "payment_sent" &&
            isInRange(g.funded_at) &&
            cycleTestingMap.get(g.cycle_id) !== true &&
            isMemberActivity(g.user_id),
        )
        .reduce((sum, g) => sum + (g.amount_approved || 0), 0),
    [grants, isInRange, cycleTestingMap, isMemberActivity],
  );

  // Approval rate counts decided applications only: applications still under
  // review would otherwise drag it down. Same definition as the Experience tab.
  const approvedGrantsCount = useMemo(
    () => filteredGrants.filter((g) => APPROVED_GRANT_STATUSES.includes(g.status || "")).length,
    [filteredGrants],
  );
  const decidedGrantsCount = useMemo(
    () => approvedGrantsCount + filteredGrants.filter((g) => g.status === "not_approved").length,
    [filteredGrants, approvedGrantsCount],
  );
  const approvalRate = useMemo(
    () => (decidedGrantsCount > 0 ? Math.round((approvedGrantsCount / decidedGrantsCount) * 1000) / 10 : 0),
    [approvedGrantsCount, decidedGrantsCount],
  );

  // Number of grant cycles that were active during the selected date range (excluding testing-only)
  const isCycleTestingOnly = (c: GrantCycle) =>
    c.is_testing_only === true || c.is_testing_only === "true";

  const numberOfGrants = useMemo(() => {
    const activeCycles = grantCycles.filter((c) => !isCycleTestingOnly(c));
    if (dateRange === 9999) return activeCycles.length;
    return activeCycles.filter((c) => {
      if (!c.start_date || !c.end_date) return false;
      const cycleStart = new Date(c.start_date);
      const cycleEnd = new Date(c.end_date);
      const selStart = cutoff;
      const selEnd = endDate;
      // Cycle was active if: cycle.start <= selectedRangeEnd AND cycle.end >= selectedRangeStart
      return cycleStart <= selEnd && cycleEnd >= selStart;
    }).length;
  }, [grantCycles, cutoff, endDate, dateRange]);

  // ── PERKS ────────────────────────────────────────────────
  const filteredRedemptions = useMemo(
    () =>
      memberRedemptions.filter((r) => isInRange(r.created_at)),
    [memberRedemptions, isInRange],
  );

  const redemptionsByDay = useMemo(
    () => buildDailySeries(filteredRedemptions.map((x) => x.created_at!)),
    [filteredRedemptions],
  );

  // Store names come from the Access Perks feed and can contain HTML
  // (e.g. "National<sup>®</sup>"). DOMParser builds an inert document: unlike
  // innerHTML on a live-page element, no handler runs and no image loads.
  const stripHtml = (html: string): string => {
    if (typeof window === "undefined" || !html.includes("<")) return html;
    const text = new DOMParser().parseFromString(html, "text/html").body.textContent;
    return text || html;
  };

  const topOffers = useMemo(() => {
    const map: Record<string, { store: string; offer: string; count: number }> = {};
    filteredRedemptions.forEach((r) => {
      const store = stripHtml(r.store_name || "Unknown");
      const title = stripHtml(r.offer_title || r.offer_key || "Unknown");
      const offer = r.store_name ? `${store}: ${title}` : title;
      const key = offer;
      if (!map[key]) {
        map[key] = { store, offer, count: 0 };
      }
      map[key].count++;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 25)
      .map(([, { store, offer, count }]) => ({
        store,
        offer,
        count,
      }));
  }, [filteredRedemptions]);

  const redemptionsByType = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRedemptions.forEach((r) => {
      const t = r.redeem_type || "unknown";
      // Map API names to display names
      const displayName = t === "instore" ? "In Store" : t === "instore_print" ? "Print" : t === "link" ? "Online" : t === "call" ? "Call" : t === "view" ? "View" : t;
      map[displayName] = (map[displayName] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredRedemptions]);

  // ── ZDS (ZERO DOLLAR STORE) ──────────────────────────────
  // Date-filtered only (for pie chart showing all statuses)
  const filteredZdsClaims = useMemo(
    () =>
      zdsClaims.filter(
        (c) =>
          c.claimed_at &&
          isInRange(c.claimed_at) &&
          isMemberActivity(c.user_id),
      ),
    [zdsClaims, isInRange, isMemberActivity],
  );

  // Date + success filtered (for stat boxes)
  const successfulZdsClaims = useMemo(
    () =>
      filteredZdsClaims.filter(
        (c) =>
          SUCCESSFUL_ZDS_STATUSES.includes(c.status || ""),
      ),
    [filteredZdsClaims],
  );

  // All-time successful ZDS claims (for Total All Time box)
  const successfulZdsClaimsAllTime = useMemo(
    () =>
      zdsClaims.filter(
        (c) =>
          SUCCESSFUL_ZDS_STATUSES.includes(c.status || "") && isMemberActivity(c.user_id),
      ),
    [zdsClaims, isMemberActivity],
  );

  // Unique ZDS claimants
  const uniqueZdsClaimants = useMemo(() => {
    return new Set(successfulZdsClaims.map((c) => c.user_id).filter(Boolean)).size;
  }, [successfulZdsClaims]);

  // ZDS claims by day (successful claims, Pacific days)
  const zdsClaimsByDay = useMemo(
    () => buildDailySeries(successfulZdsClaims.map((c) => c.claimed_at!)),
    [successfulZdsClaims],
  );

  // Top ZDS products
  const topZdsProducts = useMemo(() => {
    const map: Record<string, number> = {};
    const productMap = new Map(shopifyProducts.map((p) => [p.shopify_product_id, p.title || "Unknown"]));

    // Successful claims only: rejected, cancelled and abandoned checkouts
    // aren't products anyone received.
    successfulZdsClaims.forEach((c) => {
      const title = productMap.get(c.shopify_product_id || "") || "Unknown Product";
      map[title] = (map[title] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 25)
      .map(([product, count]) => ({
        product,
        count,
      }));
  }, [successfulZdsClaims, shopifyProducts]);

  // ZDS claims by status (excluding "created" - not a final state)
  const zdsClaimsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filteredZdsClaims.forEach((c) => {
      let s = c.status || "unknown";
      if (s !== "created") {
        // Map status values to display names
        if (s === "completed") s = "Completed";
        else if (s === "fulfilled") s = "Fulfilled";
        else if (s === "rejected_invalid_user") s = "Rejected Invalid User";
        else if (s === "rejected_monthly_limit") s = "Rejected Monthly Limit";
        else if (s === "cancelled") s = "Cancelled";
        map[s] = (map[s] || 0) + 1;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredZdsClaims]);

  // ── ENGAGEMENT ───────────────────────────────────────────
  // Filter NFW perk redemptions by date range
  const filteredNfwPerkRedemptions = useMemo(
    () =>
      nfwPerkRedemptions.filter(
        (r) => r.redeemed_at && isInRange(r.redeemed_at) && isMemberActivity(r.user_id),
      ),
    [nfwPerkRedemptions, isInRange, isMemberActivity],
  );

  // Engagement-tab activity: successful Store claims only (failed, rejected
  // and abandoned checkouts aren't engagement). Admin and test-account
  // activity is already left out of every filtered set above.
  const engagementGrants = filteredGrants;
  const engagementRedemptions = filteredRedemptions;
  const engagementZdsClaims = successfulZdsClaims;
  const engagementNfwPerks = filteredNfwPerkRedemptions;

  // Calculate unique active members (members with any activity in period)
  const activeMembers = useMemo(() => {
    const activeUserIds = new Set<string>();
    engagementGrants.forEach((g) => activeUserIds.add(g.user_id!));
    engagementRedemptions.forEach((r) => activeUserIds.add(r.user_id!));
    engagementZdsClaims.forEach((c) => activeUserIds.add(c.user_id!));
    engagementNfwPerks.forEach((r) => activeUserIds.add(r.user_id!));
    return activeUserIds.size;
  }, [engagementGrants, engagementRedemptions, engagementZdsClaims, engagementNfwPerks]);

  // Engagement-rate denominator: members who can use the programs (paid, or
  // approved free), not every profile ever created (waitlist, incomplete).
  const programEligibleCount = useMemo(
    () =>
      profiles.filter(
        (p) =>
          !excludedUserIds.has(p.id) &&
          (p.membership_level === "contributing" ||
            p.membership_level === "founding" ||
            (p.membership_level === "free" && p.is_approved_free_member === true)),
      ).length,
    [profiles, excludedUserIds],
  );



  // Total activities in period
  const totalActivities = useMemo(() => {
    return (
      engagementRedemptions.length +
      engagementZdsClaims.length +
      engagementNfwPerks.length +
      engagementGrants.length
    );
  }, [engagementRedemptions, engagementZdsClaims, engagementNfwPerks, engagementGrants]);

  // Average actions per active member
  const avgActionsPerMember = useMemo(() => {
    if (activeMembers === 0) return 0;
    return Math.round((totalActivities / activeMembers) * 10) / 10;
  }, [activeMembers, totalActivities]);

  // ── COHORT ANALYSIS ───────────────────────────────────────
  type CohortRow = {
    cohort: string;
    cohortShort: string;
    members: number;
    retained: number;
    retentionRate: number;
  };

  const cohortData = useMemo(() => {
    const cohorts = new Map<string, { total: number; active: number }>();

    profiles.forEach((p) => {
      if (!p.joined_at || excludedUserIds.has(p.id)) return;
      // Only people who became members: paid at some point, or approved free.
      // Waitlist and incomplete signups never had a membership to keep.
      const isPaidLevel = p.membership_level === "contributing" || p.membership_level === "founding";
      const isApprovedFree = p.membership_level === "free" && p.is_approved_free_member === true;
      const everMember = isPaidLevel || isApprovedFree || !!p.first_paid_at;
      if (!everMember) return;

      const key = siteDateKey(p.joined_at).slice(0, 7); // YYYY-MM in PT
      if (!cohorts.has(key)) {
        cohorts.set(key, { total: 0, active: 0 });
      }
      const cohort = cohorts.get(key)!;
      cohort.total++;

      // Still a member: paid subscription active or set to cancel at period
      // end (still paid through), or an approved free member.
      const stillMember =
        (isPaidLevel && (p.subscription_status === "active" || p.subscription_status === "canceling")) ||
        isApprovedFree;
      if (stillMember) {
        cohort.active++;
      }
    });

    const rows: CohortRow[] = [];
    const sortedCohorts = Array.from(cohorts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const displayCohorts = sortedCohorts.slice(-12);

    displayCohorts.forEach(([key, data]) => {
      // key is a PT calendar month; render it as written (UTC avoids a month shift)
      const date = new Date(key + '-01T00:00:00Z');
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      const shortLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
      rows.push({
        cohort: label,
        cohortShort: shortLabel,
        members: data.total,
        retained: data.active,
        retentionRate: data.total > 0 ? Math.round((data.active / data.total) * 100) : 0,
      });
    });

    return rows;
  }, [profiles, excludedUserIds]);

  const overallRetention = useMemo(() => {
    const totalMembers = cohortData.reduce((sum, c) => sum + c.members, 0);
    const totalRetained = cohortData.reduce((sum, c) => sum + c.retained, 0);
    return {
      totalMembers,
      totalRetained,
      rate: totalMembers > 0 ? Math.round((totalRetained / totalMembers) * 100) : 0,
    };
  }, [cohortData]);

  // ── EXPORT CSV ───────────────────────────────────────────
  const exportCSV = () => {
    let rows: string[][] = [];
    let filename = "";

    if (tab === "members") {
      filename = "nfw-members-analytics.csv";
      rows = [
        ["Date", "Profiles Started", "New Paid Members"],
        ...membersByDay.map((r) => [r.key, String(r.started), String(r.paid)]),
        [],
        ["Status", "Count"],
        ...membersByLevel.map((r) => [r.name, String(r.value)]),
        [],
        ["State", "Members"],
        ...membersByState.map((r) => [r.state, String(r.count)]),
      ];
    } else if (tab === "grants") {
      filename = "nfw-grants-analytics.csv";
      rows = [
        ["Date", "Applications"],
        ...grantsByDay.map((r) => [r.key, String(r.count)]),
        [],
        ["Status", "Count"],
        ...grantsByStatus.map((r) => [r.name, String(r.value)]),
      ];
    } else if (tab === "zds") {
      filename = "nfw-zds-analytics.csv";
      rows = [
        ["Date", "Claims"],
        ...zdsClaimsByDay.map((r) => [r.key, String(r.count)]),
        [],
        ["Product", "Claims"],
        ...topZdsProducts.map((r) => [r.product, String(r.count)]),
      ];
    } else if (tab === "perks") {
      filename = "nfw-perks-analytics.csv";
      rows = [
        ["Date", "Redemptions"],
        ...redemptionsByDay.map((r) => [r.key, String(r.count)]),
        [],
        ["Offer", "Redemptions"],
        ...topOffers.map((r) => [r.offer, String(r.count)]),
      ];
    } else if (tab === "engagement") {
      filename = "nfw-engagement-analytics.csv";
      rows = [
        ["Metric", "Value"],
        ["Total active members", String(activeMembers)],
        ["Total activities", String(totalActivities)],
        ["Avg actions per active member", String(avgActionsPerMember)],
        ["Current members (engagement rate denominator)", String(programEligibleCount)],
        ["Perk redemptions", String(engagementRedemptions.length)],
        ["ZDS claims (successful)", String(engagementZdsClaims.length)],
        ["NFW perk redemptions", String(engagementNfwPerks.length)],
        ["Grant applications", String(engagementGrants.length)],
      ];
    } else if (tab === "cohorts") {
      filename = "nfw-cohorts-analytics.csv";
      rows = [
        ["Cohort", "Members", "Still members", "Retention %"],
        ...cohortData.map((r) => [r.cohort, String(r.members), String(r.retained), String(r.retentionRate)]),
      ];
    } else if (tab === "support") {
      filename = "nfw-support-analytics.csv";
      rows = freshdeskStats
        ? [
            ["Status", "Tickets"],
            ["Total", String(freshdeskStats.total)],
            ["Open", String(freshdeskStats.open)],
            ["Pending", String(freshdeskStats.pending)],
            ["Resolved", String(freshdeskStats.resolved)],
            ["Closed", String(freshdeskStats.closed)],
          ]
        : [["Freshdesk data not loaded"]];
    } else {
      return;
    }

    const csv = rows.map((r) => r.map(escapeCsvField).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── EXPORT FULL CSV (Members Data) ──────────────────────────
  const exportFullCSV = () => {
    let url = "/api/admin/members/export";
    const params = new URLSearchParams();

    if (dateRange === "custom") {
      if (customStartDate) params.set("start_date", customStartDate);
      if (customEndDate) params.set("end_date", customEndDate);
    } else if (dateRange !== 9999) {
      // Presets: the export route takes Pacific calendar dates.
      params.set("start_date", siteDateKey(cutoff.toISOString()));
      params.set("end_date", siteDateKey(new Date().toISOString()));
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    window.open(url, "_blank");
  };

  // Get date range label for exports
  const getDateRangeLabel = (): string => {
    if (dateRange === "custom") {
      if (customStartDate && customEndDate) {
        return `${customStartDate}-to-${customEndDate}`;
      }
      return "custom";
    }
    const option = DATE_RANGE_OPTIONS.find((o) => o.value === dateRange);
    return option?.label.toLowerCase().replace(/\s+/g, "-") || String(dateRange);
  };

  // ── EXPORT PDF ───────────────────────────────────────────
  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");
    if (!dashboardRef.current) return;
    const canvas = await html2canvas(dashboardRef.current, {
      scale: 1.5,
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width / 1.5, canvas.height / 1.5],
    });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 1.5, canvas.height / 1.5);
    pdf.save(`nfw-analytics-${tab}-${getDateRangeLabel()}.pdf`);
  };

  const statCards =
    tab === "members"
      ? [
          {
            label: "Profiles",
            value: filteredProfiles.length,
            icon: Users,
            color: "bg-nfw-wisteria",
            text: "text-white",
          },
          {
            label: "Active Profiles",
            value: activeProfilesCount,
            icon: Users,
            color: "bg-nfw-wisteria",
            text: "text-white",
          },
          {
            label: "Paid Members",
            value: paidMembersCount,
            icon: TrendingUp,
            color: "bg-nfw-wisteria",
            text: "text-white",
          },
          {
            label: "Free Members",
            value: freeMembersCount,
            icon: Users,
            color: "bg-nfw-wisteria",
            text: "text-white",
          },
          {
            label: "Waitlist",
            value: waitlistCount,
            icon: Users,
            color: "bg-nfw-stone/40",
            text: "text-nfw-blackberry",
          },
          {
            label: "Abandoned",
            value: abandonedCount,
            icon: Users,
            color: "bg-nfw-stone/40",
            text: "text-nfw-blackberry",
          },
          {
            label: "Profile Incomplete",
            value: profileIncompleteCount,
            icon: Users,
            color: "bg-nfw-stone/40",
            text: "text-nfw-blackberry",
          },
          {
            label: "Admins",
            value: adminCount,
            icon: Users,
            color: "bg-nfw-aubergine",
            text: "text-white",
          },
          {
            label: "Contributing $15",
            value: contributingCount,
            icon: DollarSign,
            color: "bg-nfw-wisteria",
            text: "text-white",
          },
          {
            label: "Founding $100",
            value: foundingCount,
            icon: DollarSign,
            color: "bg-nfw-wisteria",
            text: "text-white",
          },
          {
            label: "Verified Revenue (All Time)",
            value: `$${verifiedLifetimeRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: "bg-nfw-aubergine",
            text: "text-white",
          },
          {
            label: "Verified Revenue (Period)",
            value: `$${Math.round(verifiedPeriodRevenue).toLocaleString()}`,
            icon: DollarSign,
            color: "bg-nfw-wisteria",
            text: "text-white",
          },
          {
            label: retentionRate === null ? "Retention Rate (needs 12 months of members)" : "Retention Rate (12+ months)",
            value: retentionRate === null ? "—" : `${retentionRate}%`,
            icon: TrendingUp,
            color: "bg-nfw-aubergine",
            text: "text-white",
          },
          {
            label: "Avg Dues",
            value: `$${averageDues}`,
            icon: DollarSign,
            color: "bg-nfw-wisteria",
            text: "text-white",
          },
          {
            label: `Churn (${churnCount} ended)`,
            value: `${churnRate}%`,
            icon: TrendingUp,
            color: "bg-nfw-aubergine",
            text: "text-white",
          },
          {
            label: "Paid / Free",
            value: `${paidPercent}% / ${freePercent}%`,
            icon: TrendingUp,
            color: "bg-nfw-wisteria",
            text: "text-white",
          },
          {
            label: "Signups (Members + Newsletter)",
            value: combinedSignups,
            icon: Users,
            color: "bg-nfw-wisteria",
            text: "text-white",
          },
          {
            label: "Newsletter Subscribers",
            value: totalNewsletterSubscribers,
            icon: Users,
            color: "bg-nfw-wisteria",
            text: "text-white",
          },
          {
            label: "Stripe Active",
            value: stripeLiveStats?.total.count ?? "—",
            icon: DollarSign,
            color: "bg-nfw-aubergine",
            text: "text-white",
          },
          {
            label: "DB vs Stripe Diff (all time)",
            value: stripeLiveStats ? paidMembersAllTime - stripeLiveStats.total.count : "—",
            icon: TrendingUp,
            color: !stripeLiveStats
              ? "bg-nfw-stone/40"
              : paidMembersAllTime - stripeLiveStats.total.count === 0
              ? "bg-green-500"
              : "bg-red-500",
            text: "text-white",
          },
        ]
      : tab === "grants"
        ? [
            {
              label: "Applications",
              value: filteredGrants.length,
              icon: FileText,
              color: "bg-nfw-wisteria",
              text: "text-white",
            },
            {
              label: `Approval Rate (of ${decidedGrantsCount.toLocaleString()} decided)`,
              value: `${approvalRate}%`,
              icon: TrendingUp,
              color: "bg-nfw-wisteria",
              text: "text-white",
            },
            {
              label: "Disbursed",
              value: `$${totalFunded.toLocaleString()}`,
              icon: DollarSign,
              color: "bg-nfw-wisteria",
              text: "text-white",
            },
            {
              label: "Number of Approvals",
              value: approvedGrantsCount,
              icon: Gift,
              color: "bg-nfw-wisteria",
              text: "text-white",
            },
            {
              label: "Number of Grants",
              value: numberOfGrants,
              icon: Calendar,
              color: "bg-nfw-wisteria",
              text: "text-white",
            },
          ]
        : tab === "perks"
          ? [
              {
                label: "Redemptions (1 per member, offer and day)",
                value: filteredRedemptions.length,
                icon: Gift,
                color: "bg-nfw-wisteria",
                text: "text-white",
              },
              {
                label: "Total All Time",
                value: memberRedemptions.length,
                icon: Gift,
                color: "bg-nfw-aubergine",
                text: "text-white",
              },
              {
                label: "Unique Redeemers",
                value: new Set(filteredRedemptions.map((r) => r.user_id)).size,
                icon: TrendingUp,
                color: "bg-nfw-wisteria",
                text: "text-white",
              },
              {
                label: "Redeem Types",
                value: new Set(filteredRedemptions.map((r) => r.redeem_type))
                  .size,
                icon: FileText,
                color: "bg-nfw-wisteria",
                text: "text-white",
              },
            ]
          : tab === "zds"
            ? [
                {
                  label: "ZDS Claims",
                  value: successfulZdsClaims.length,
                  icon: Gift,
                  color: "bg-nfw-wisteria",
                  text: "text-white",
                },
                {
                  label: "Total All Time",
                  value: successfulZdsClaimsAllTime.length,
                  icon: Gift,
                  color: "bg-nfw-aubergine",
                  text: "text-white",
                },
                {
                  label: "Unique Claimants",
                  value: uniqueZdsClaimants,
                  icon: Users,
                  color: "bg-nfw-wisteria",
                  text: "text-white",
                },
              ]
            : tab === "engagement"
              ? []
              : tab === "cohorts"
                ? [
                    {
                      label: "Total Cohorts",
                      value: cohortData.length,
                      icon: Users,
                      color: "bg-nfw-blackberry",
                      text: "text-white",
                    },
                    {
                      label: "Total Members",
                      value: overallRetention.totalMembers,
                      icon: Users,
                      color: "bg-nfw-aubergine",
                      text: "text-white",
                    },
                    {
                      label: "Still Members",
                      value: overallRetention.totalRetained,
                      icon: TrendingUp,
                      color: "bg-nfw-aubergine",
                      text: "text-white",
                    },
                    {
                      label: "Overall Retention",
                      value: `${overallRetention.rate}%`,
                      icon: TrendingUp,
                      color: "bg-nfw-aubergine",
                      text: "text-white",
                    },
                  ]
              : tab === "support"
                ? []
                : []

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Tabs (own row: 8 tabs + controls no longer fit on one line) */}
        <div className="flex flex-wrap gap-2">
          {(["members", "grants", "perks", "zds", "engagement", "cohorts", "experience", "support"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                tab === t
                  ? "bg-nfw-blackberry text-white"
                  : "bg-white text-nfw-blackberry border border-nfw-blackberry/10 hover:bg-nfw-blackberry/5"
              }`}
            >
              {t === "zds" ? "ZDS" : t}
            </button>
          ))}
        </div>

        <div className="flex gap-3 items-center flex-wrap sm:justify-end">
          {/* Date Range Dropdown (the Experience tab is an all-time baseline) */}
          {tab !== "experience" && (
          <div className="relative">
            <select
              value={dateRange === "custom" ? "custom" : dateRange}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "custom") {
                  setDateRange("custom");
                } else {
                  setDateRange(Number(val));
                  setCustomStartDate("");
                  setCustomEndDate("");
                }
              }}
              className="text-sm border border-nfw-blackberry/20 pl-10 pr-8 py-2 focus:outline-none focus:border-nfw-blackberry bg-white appearance-none cursor-pointer"
            >
              {DATE_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nfw-blackberry/50 pointer-events-none" />
          </div>
          )}

          {/* Custom Date Range Pickers */}
          {tab !== "experience" && dateRange === "custom" && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-sm border border-nfw-blackberry/20 px-3 py-2 focus:outline-none focus:border-nfw-blackberry bg-white"
                placeholder="Start date"
              />
              <span className="text-nfw-blackberry/50 text-sm">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-sm border border-nfw-blackberry/20 px-3 py-2 focus:outline-none focus:border-nfw-blackberry bg-white"
                placeholder="End date"
              />
            </div>
          )}

          {/* Export CSV (the Experience tab has its own CSV export) */}
          {tab !== "experience" && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-nfw-blackberry/10 text-sm font-semibold text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          )}

          {/* Export Full CSV */}
          <button
            onClick={exportFullCSV}
            className="flex items-center gap-2 px-4 py-2 bg-nfw-aubergine text-white text-sm font-semibold hover:bg-nfw-aubergine/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Full CSV
          </button>

          {/* Export PDF */}
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-nfw-blackberry text-white text-sm font-semibold hover:bg-nfw-blackberry/90 transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Dashboard content captured for PDF */}
      <div ref={dashboardRef}>
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card) => (
            <div key={card.label} className={`${card.color} p-5`}>
              <div className={`text-2xl font-black mb-1 ${card.text}`}>
                {card.value}
              </div>
              <div className={`text-xs font-semibold ${card.text} opacity-70`}>
                {card.label}
              </div>
            </div>
          ))}
        </div>

        {/* MEMBERS TAB */}
        {tab === "members" && (
          <div className="space-y-6">
            <div className="bg-white border border-nfw-blackberry/10 p-6">
              <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                Profiles Started vs. New Paid Members
              </h3>
              {membersByDay.length === 0 ? (
                <p className="text-nfw-blackberry/40 text-sm text-center py-8">
                  No new members in this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={membersByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip labelFormatter={(label, payload) => payload?.[0]?.payload?.dateFull || label} />
                    <Legend verticalAlign="bottom" height={36} />
                    <Line
                      type="monotone"
                      dataKey="started"
                      stroke="#3E145F"
                      strokeWidth={2}
                      dot={false}
                      name="Profiles Started"
                    />
                    <Line
                      type="monotone"
                      dataKey="paid"
                      stroke="#7786BE"
                      strokeWidth={2}
                      dot={false}
                      name="New Paid Members"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Upgrades Section */}
            <div className="bg-white border border-nfw-blackberry/10 p-6">
              <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                Membership Upgrades
              </h3>
              <p className="text-xs text-nfw-blackberry/50 mb-4 font-ui">
                Click a card to see the members behind the number.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {upgradeGroups.map((group) => {
                  const isActive = expandedUpgrade === group.key;
                  const isEmpty = group.members.length === 0;
                  return (
                    <button
                      key={group.key}
                      type="button"
                      disabled={isEmpty}
                      aria-expanded={isActive}
                      onClick={() =>
                        setExpandedUpgrade((prev) => (prev === group.key ? null : group.key))
                      }
                      className={`relative p-4 text-center transition-colors ${
                        isActive
                          ? "bg-nfw-wisteria text-white"
                          : isEmpty
                          ? "bg-nfw-wisteria/10 opacity-50 cursor-not-allowed"
                          : "bg-nfw-wisteria/10 hover:bg-nfw-wisteria/20 cursor-pointer"
                      }`}
                    >
                      <div
                        className={`text-2xl font-black mb-1 ${
                          isActive ? "text-white" : "text-nfw-wisteria"
                        }`}
                      >
                        {group.members.length}
                      </div>
                      <div
                        className={`text-xs font-semibold ${
                          isActive ? "text-white/90" : "text-nfw-blackberry/60"
                        }`}
                      >
                        {group.label}
                      </div>
                      {!isEmpty && (
                        <ChevronDown
                          className={`w-3.5 h-3.5 absolute top-2 right-2 transition-transform ${
                            isActive ? "rotate-180 text-white" : "text-nfw-wisteria/60"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {expandedUpgradeGroup && (
                <div className="mt-4 border border-nfw-wisteria/40 bg-nfw-wisteria/5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-b border-nfw-wisteria/30">
                    <div className="font-ui font-black text-sm text-nfw-blackberry">
                      {expandedUpgradeGroup.label}{" "}
                      <span className="text-nfw-blackberry/50 font-semibold">
                        — {expandedUpgradeGroup.members.length}{" "}
                        {expandedUpgradeGroup.members.length === 1 ? "member" : "members"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => exportUpgradeGroupCSV(expandedUpgradeGroup)}
                        disabled={contactsLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-ui font-bold uppercase tracking-wide bg-nfw-aubergine text-white hover:bg-nfw-aubergine/90 transition-colors disabled:opacity-50 disabled:cursor-wait"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedUpgrade(null)}
                        className="px-3 py-1.5 text-xs font-ui font-bold uppercase tracking-wide text-nfw-blackberry/60 hover:text-nfw-blackberry transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  {(contactsLoading || contactsError) && (
                    <p className={`px-4 py-2 text-xs font-ui ${contactsError ? "text-red-600" : "text-nfw-blackberry/60"}`}>
                      {contactsError ?? "Loading names and emails…"}
                    </p>
                  )}
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="text-left text-xs font-ui font-black uppercase tracking-wide text-nfw-blackberry/60">
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Email</th>
                          <th className="px-4 py-2 whitespace-nowrap">Joined</th>
                          <th className="px-4 py-2 whitespace-nowrap">Upgraded</th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {expandedUpgradeGroup.members.map(({ profile, upgradedAt }, idx) => {
                          const contact = contactOf(profile);
                          return (
                          <tr
                            key={profile.id}
                            className={`border-t border-nfw-blackberry/5 ${
                              idx % 2 === 0 ? "bg-white" : "bg-nfw-dove/40"
                            }`}
                          >
                            <td className="px-4 py-2 text-nfw-blackberry font-medium">
                              {contact.full_name || (
                                <span className="text-nfw-blackberry/40 italic">No name</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {contact.email ? (
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="text-nfw-aubergine hover:underline truncate max-w-[220px]"
                                    title={contact.email}
                                  >
                                    {contact.email}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => copyUpgradeEmail(contact.email!)}
                                    className="p-1 text-nfw-blackberry/40 hover:text-nfw-aubergine transition-colors"
                                    title="Copy email"
                                  >
                                    {copiedEmail === contact.email ? (
                                      <Check className="w-3.5 h-3.5 text-green-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-nfw-blackberry/40">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-nfw-blackberry/70 whitespace-nowrap">
                              {formatUtcDate(profile.joined_at)}
                            </td>
                            <td className="px-4 py-2 text-nfw-blackberry/70 whitespace-nowrap">
                              {formatUtcDate(upgradedAt)}
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap">
                              <Link
                                href="/admin/members"
                                onClick={() => {
                                  if (contact.email) {
                                    sessionStorage.setItem("membersSearch", contact.email);
                                  }
                                }}
                                className="text-xs font-ui font-bold text-nfw-aubergine hover:underline"
                              >
                                View →
                              </Link>
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {expandedUpgradeGroup.key === "waitlist_to_free" && (
                    <p className="px-4 py-2 text-[11px] text-nfw-blackberry/50 border-t border-nfw-wisteria/20 font-ui">
                      &ldquo;Upgraded&rdquo; is when the member clicked their approval link. Members approved before the link flow existed show their join date.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-nfw-blackberry/10 p-6">
                <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                  Membership Level Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={membersByLevel}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {membersByLevel.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] || "#E5E7EB"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-nfw-blackberry/10 p-6">
                <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                  Top 10 States
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={membersByState} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="state"
                      type="category"
                      tick={{ fontSize: 11 }}
                      width={50}
                      interval={0}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#3E145F"
                      name="Members"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* GRANTS TAB */}
        {tab === "grants" && (
          <div className="space-y-6">
            <div className="bg-white border border-nfw-blackberry/10 p-6">
              <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                Grant Applications Over Time
              </h3>
              {grantsByDay.length === 0 ? (
                <p className="text-nfw-blackberry/40 text-sm text-center py-8">
                  No applications in this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={grantsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={dailyTooltipLabel} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3E145F"
                      strokeWidth={2}
                      dot={false}
                      name="Applications"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* PERKS TAB */}
        {tab === "perks" && (
          <div className="space-y-6">
            <div className="bg-white border border-nfw-blackberry/10 p-6">
              <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                Redemptions Over Time
              </h3>
              {redemptionsByDay.length === 0 ? (
                <p className="text-nfw-blackberry/40 text-sm text-center py-8">
                  No redemptions in this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={redemptionsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={dailyTooltipLabel} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3E145F"
                      strokeWidth={2}
                      dot={false}
                      name="Redemptions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-nfw-blackberry/10 p-6">
                <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                  Top Offers Redeemed
                </h3>
                <ResponsiveContainer width="100%" height={560}>
                  <BarChart data={topOffers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="store"
                      type="category"
                      tick={{ fontSize: 10 }}
                      width={150}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} redemptions`]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.offer || label}
                      contentStyle={{ maxWidth: '300px', wordBreak: 'break-word', whiteSpace: 'normal' }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#3E145F"
                      name=""
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-nfw-blackberry/10 p-6">
                <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                  Redemption Methods
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={redemptionsByType}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {redemptionsByType.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>
        )}

        {/* ZDS TAB */}
        {tab === "zds" && (
          <div className="space-y-6">
            <div className="bg-white border border-nfw-blackberry/10 p-6">
              <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                ZDS Claims Over Time
              </h3>
              {zdsClaimsByDay.length === 0 ? (
                <p className="text-nfw-blackberry/40 text-sm text-center py-8">
                  No claims in this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={zdsClaimsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={dailyTooltipLabel} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3E145F"
                      strokeWidth={2}
                      dot={false}
                      name="Claims"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-nfw-blackberry/10 p-6">
                <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                  Top Products Claimed
                </h3>
                {topZdsProducts.length === 0 ? (
                  <p className="text-nfw-blackberry/40 text-sm text-center py-8">
                    No claims in this period.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={560}>
                    <BarChart data={topZdsProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        dataKey="product"
                        type="category"
                        tick={{ fontSize: 10 }}
                        width={200}
                        interval={0}
                      />
                      <Tooltip
                        formatter={(value) => [`${value} claims`]}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.product || label}
                        contentStyle={{ maxWidth: '300px', wordBreak: 'break-word', whiteSpace: 'normal' }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#3E145F"
                        name=""
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white border border-nfw-blackberry/10 p-6">
                <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                  Claims by Status
                </h3>
                {zdsClaimsByStatus.length === 0 ? (
                  <p className="text-nfw-blackberry/40 text-sm text-center py-8">
                    No claims in this period.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={560}>
                    <PieChart>
                      <Pie
                        data={zdsClaimsByStatus}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                      >
                        {zdsClaimsByStatus.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
<Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ENGAGEMENT TAB */}
        {tab === "engagement" && (
          <div className="space-y-6">
            <div className="bg-white border border-nfw-blackberry/10 p-6">
              <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                Engagement Summary
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-nfw-wisteria">
                  <div className="text-3xl font-black text-white mb-1">
                    {activeMembers}
                  </div>
                  <div className="text-xs font-semibold text-white/70">
                    Total Active Members
                  </div>
                </div>
                <div className="text-center p-4 bg-nfw-wisteria">
                  <div className="text-3xl font-black text-white mb-1">
                    {totalActivities}
                  </div>
                  <div className="text-xs font-semibold text-white/70">
                    Total Activities
                  </div>
                </div>
                <div className="text-center p-4 bg-nfw-wisteria">
                  <div className="text-3xl font-black text-white mb-1">
                    {avgActionsPerMember}
                  </div>
                  <div className="text-xs font-semibold text-white/70">
                    Avg Actions per Member
                  </div>
                </div>
                <div className="text-center p-4 bg-nfw-wisteria">
                  <div className="text-3xl font-black text-white mb-1">
                    {programEligibleCount > 0 ? Math.round((activeMembers / programEligibleCount) * 100) : 0}%
                  </div>
                  <div className="text-xs font-semibold text-white/70">
                    Engagement Rate (of current members)
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-nfw-blackberry/10 p-6">
              <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                Activity Breakdown
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-nfw-dove">
                  <div className="text-3xl font-black text-nfw-blackberry mb-1">
                    {engagementRedemptions.length}
                  </div>
                  <div className="text-xs font-semibold text-nfw-blackberry/70">
                    Perk Redemptions
                  </div>
                </div>
                <div className="text-center p-4 bg-nfw-dove">
                  <div className="text-3xl font-black text-nfw-blackberry mb-1">
                    {engagementZdsClaims.length}
                  </div>
                  <div className="text-xs font-semibold text-nfw-blackberry/70">
                    ZDS Claims
                  </div>
                </div>
                <div className="text-center p-4 bg-nfw-dove">
                  <div className="text-3xl font-black text-nfw-blackberry mb-1">
                    {engagementNfwPerks.length}
                  </div>
                  <div className="text-xs font-semibold text-nfw-blackberry/70">
                    NFW Perk Redemptions
                  </div>
                </div>
                <div className="text-center p-4 bg-nfw-dove">
                  <div className="text-3xl font-black text-nfw-blackberry mb-1">
                    {engagementGrants.length}
                  </div>
                  <div className="text-xs font-semibold text-nfw-blackberry/70">
                    Grant Applications
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COHORTS TAB */}
        {tab === "cohorts" && (
          <div className="space-y-6">
            <div className="bg-white border border-nfw-blackberry/10 p-6">
              <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                Membership Cohorts by Join Month
              </h3>
              <p className="text-sm text-nfw-blackberry/60 mb-6">
                Members grouped by the month they joined (paid at some point, or approved free; waitlist and incomplete
                signups aren&apos;t counted). Retention = still a member today (paid and active or canceling at period end,
                or approved free) / members in the cohort. Not affected by the date range.
              </p>
              {cohortData.length === 0 ? (
                <p className="text-nfw-blackberry/40 text-sm text-center py-8">
                  No cohort data available.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-nfw-blackberry/10">
                        <th className="text-left py-3 px-4 font-black text-nfw-blackberry">Cohort</th>
                        <th className="text-right py-3 px-4 font-black text-nfw-blackberry">Members</th>
                        <th className="text-right py-3 px-4 font-black text-nfw-blackberry">Still members</th>
                        <th className="text-right py-3 px-4 font-black text-nfw-blackberry">Retention</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohortData.map((row) => (
                        <tr key={row.cohort} className="border-b border-nfw-blackberry/5 hover:bg-nfw-blackberry/5">
                          <td className="py-3 px-4 font-medium text-nfw-blackberry">{row.cohort}</td>
                          <td className="py-3 px-4 text-right text-nfw-blackberry/70">{row.members}</td>
                          <td className="py-3 px-4 text-right text-nfw-blackberry/70">{row.retained}</td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`inline-block px-2 py-1 text-xs font-black rounded ${
                                row.retentionRate >= 70
                                  ? "bg-nfw-aubergine text-white"
                                  : row.retentionRate >= 40
                                  ? "bg-nfw-wisteria text-white"
                                  : "bg-nfw-wisteria text-white"
                              }`}
                            >
                              {row.retentionRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Retention Chart */}
            {cohortData.length > 0 && (
              <div className="bg-white border border-nfw-blackberry/10 p-6">
                <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                  Retention Rate by Cohort
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={cohortData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="cohortShort" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Retention"]}
                      labelFormatter={(label) => `Cohort: ${label}`}
                    />
                    <Bar
                      dataKey="retentionRate"
                      name="Retention Rate"
                      radius={[4, 4, 0, 0]}
                    >
                      {cohortData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === cohortData.length - 1 ? "#3E145F" : "#7786BE"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* SUPPORT TAB */}
        {tab === "experience" && <MemberExperienceTab />}

        {tab === "support" && (
          <div className="space-y-6">
            <div className="bg-white border border-nfw-blackberry/10 p-6">
              <h3 className="font-black text-nfw-blackberry mb-4 font-ui">
                Freshdesk Support Tickets
              </h3>
              {freshdeskLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-pulse text-nfw-blackberry/50">
                    Loading Freshdesk data...
                  </div>
                </div>
              ) : freshdeskError ? (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-4">{freshdeskError}</p>
                  <button
                    onClick={() => setFreshdeskReload((n) => n + 1)}
                    className="px-4 py-2 bg-nfw-blackberry text-white text-sm font-semibold hover:bg-nfw-blackberry/90"
                  >
                    Retry
                  </button>
                </div>
              ) : freshdeskStats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-nfw-wisteria">
                      <div className="text-3xl font-black text-white">
                        {freshdeskStats.total}
                      </div>
                      <div className="text-xs font-semibold text-white/70 mt-1">
                        Total Tickets
                      </div>
                    </div>
                    <div className="text-center p-4 bg-nfw-wisteria">
                      <div className="text-3xl font-black text-white">
                        {freshdeskStats.open}
                      </div>
                      <div className="text-xs font-semibold text-white/70 mt-1">
                        Open
                      </div>
                    </div>
                    <div className="text-center p-4 bg-nfw-wisteria">
                      <div className="text-3xl font-black text-white">
                        {freshdeskStats.pending}
                      </div>
                      <div className="text-xs font-semibold text-white/70 mt-1">
                        Pending
                      </div>
                    </div>
                    <div className="text-center p-4 bg-nfw-wisteria">
                      <div className="text-3xl font-black text-white">
                        {freshdeskStats.resolved}
                      </div>
                      <div className="text-xs font-semibold text-white/70 mt-1">
                        Resolved
                      </div>
                    </div>
                    <div className="text-center p-4 bg-nfw-wisteria">
                      <div className="text-3xl font-black text-white">
                        {freshdeskStats.closed}
                      </div>
                      <div className="text-xs font-semibold text-white/70 mt-1">
                        Closed
                      </div>
                    </div>
                  </div>
                  {freshdeskStats.truncated && (
                    <p className="text-xs text-red-600 text-center">
                      Only the 5,000 most recent tickets were counted. Pick a shorter date range for exact totals.
                    </p>
                  )}
                  <p className="text-xs text-nfw-blackberry/50 text-center">
                    Tickets created in the selected range, from Freshdesk. Fetched:{" "}
                    {new Date(freshdeskStats.fetchedAt ?? Date.now()).toLocaleTimeString(undefined, { timeZone: SITE_TZ })}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 text-nfw-blackberry/50">
                  Select the Support tab to load Freshdesk data.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
