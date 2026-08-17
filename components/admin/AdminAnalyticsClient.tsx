"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
} from "lucide-react";
import { getCategory } from "@/lib/member-categories";

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

type Profile = {
  id: string;
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
  city: string | null;
  household_income: string | null;
  date_of_birth: string | null;
  is_admin: boolean | null;
  profile_completed: boolean | null;
};

type Grant = {
  id: string;
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

type GrantCycle = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  is_testing_only: boolean | string | null;
};

export default function AdminAnalyticsClient({
  profiles,
  grants,
  grantCycles,
  redemptions,
  newsletterEmails,
  zdsClaims,
  shopifyProducts,
  nfwPerkRedemptions,
}: {
  profiles: Profile[];
  grants: Grant[];
  grantCycles: GrantCycle[];
  redemptions: Redemption[];
  newsletterEmails: NewsletterEmail[];
  zdsClaims: ZdsClaim[];
  shopifyProducts: ShopifyProduct[];
  nfwPerkRedemptions: NfwPerkRedemption[];
}) {
  const [tab, setTab] = useState<"members" | "grants" | "perks" | "zds" | "engagement" | "cohorts" | "support">("members");
  const [dateRange, setDateRange] = useState<number | "custom">(9999);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [freshdeskStats, setFreshdeskStats] = useState<{
    total: number;
    open: number;
    pending: number;
    resolved: number;
    closed: number;
  } | null>(null);
  const [freshdeskLoading, setFreshdeskLoading] = useState(false);
  const [freshdeskError, setFreshdeskError] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Fetch Freshdesk stats when support tab is active or date range changes
  useEffect(() => {
    if (tab !== "support") return;
    if (freshdeskLoading) return; // Already loading, skip

    setFreshdeskLoading(true);

    // Calculate actual start date for Freshdesk API
    // Freshdesk uses updated_since for date filtering
    const params = new URLSearchParams();
    const now = new Date();

    if (dateRange === "custom") {
      // Custom range uses explicit dates
      if (customStartDate) params.set("start_date", customStartDate);
      if (customEndDate) params.set("end_date", customEndDate);
    } else if (dateRange !== 9999) {
      let startDate: Date;

      if (dateRange === -1) {
        // Month to date - start of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateRange === -2) {
        // Quarter to date - start of current quarter
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterMonth, 1);
      } else if (dateRange === -3) {
        // Year to date - start of current year
        startDate = new Date(now.getFullYear(), 0, 1);
      } else {
        // Regular day offset (7, 30, 90, 180, 365)
        startDate = new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000);
      }

      params.set("start_date", startDate.toISOString().split("T")[0]);
    }
    // For 9999 (All Time), don't send any date params

    const queryString = params.toString();

    fetch(`/api/admin/analytics/freshdesk${queryString ? `?${queryString}` : ""}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch Freshdesk stats");
        return res.json();
      })
      .then((data) => {
        setFreshdeskStats(data);
        setFreshdeskLoading(false);
      })
      .catch((err) => {
        setFreshdeskError(err.message);
        setFreshdeskLoading(false);
      });
  }, [tab, dateRange, customStartDate, customEndDate]);

  // Calculate cutoff based on selected date range
  const cutoff = useMemo(() => {
    const now = new Date();

    if (dateRange === 9999) {
      // All time - return epoch
      return new Date(0);
    }

    if (dateRange === "custom") {
      if (!customStartDate) return new Date(0);
      // Parse YYYY-MM-DD and create date in UTC (date input returns YYYY-MM-DD)
      const parts = customStartDate.split("-");
      const utcMs = Date.UTC(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
        0,
        0,
        0,
        0
      );
      return new Date(utcMs);
    }

    if (dateRange === -1) {
      // Month to date - start of current month
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    if (dateRange === -2) {
      // Quarter to date - start of current quarter
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), quarterMonth, 1);
    }

    if (dateRange === -3) {
      // Year to date - start of current year
      return new Date(now.getFullYear(), 0, 1);
    }

    // Regular day offset
    return new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000);
  }, [dateRange, customStartDate]);

  // Get end date for custom range (end of end date day)
  const endDate = useMemo(() => {
    if (dateRange !== "custom" || !customEndDate) return new Date();
    // Parse YYYY-MM-DD and create end-of-day in UTC (date input returns YYYY-MM-DD)
    const parts = customEndDate.split("-");
    const utcMs = Date.UTC(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
      23,
      59,
      59,
      999
    );
    return new Date(utcMs);
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

  // ── MEMBERS ──────────────────────────────────────────────
  const filteredProfiles = useMemo(
    () =>
      profiles.filter((p) => p.joined_at && isInRange(p.joined_at)),
    [profiles, isInRange],
  );

  const membersByDay = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProfiles.forEach((p) => {
      const d = p.joined_at!.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [filteredProfiles]);

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

  // Paid members (non-admin only) - defined early for use in upgradedPercent
  const paidCount = useMemo(() => {
    return filteredProfiles.filter(
      (p) =>
        p.is_admin !== true &&
        (p.membership_level === "contributing" || p.membership_level === "founding")
    ).length;
  }, [filteredProfiles]);

  const upgradedCount = useMemo(() => {
    return filteredProfiles.filter((p) => {
      if (p.is_admin) return false;
      if (!p.first_paid_at || !p.joined_at) return false;
      const daysDiff =
        (new Date(p.first_paid_at).getTime() - new Date(p.joined_at).getTime()) /
        (1000 * 60 * 60 * 24);
      return daysDiff >= 1;
    }).length;
  }, [filteredProfiles]);

  const upgradedPercent = useMemo(() => {
    return paidCount > 0 ? Math.round((upgradedCount / paidCount) * 100) : 0;
  }, [paidCount, upgradedCount]);

  // Upgrade stats - counts members who upgraded from one tier to another
  // Excludes admins, incomplete profiles, and abandoned profiles

  // free → contributing (complete free member who upgraded to contributing)
  const freeToContributingCount = useMemo(() => {
    return filteredProfiles.filter((p) => {
      if (p.is_admin) return false;
      if (p.profile_completed !== true) return false;
      if (p.free_membership_contact_submitted !== true) return false; // excludes abandoned
      return p.previous_membership_level === "free" && p.membership_level === "contributing";
    }).length;
  }, [filteredProfiles]);

  // free → founding (complete free member who upgraded to founding)
  const freeToFoundingCount = useMemo(() => {
    return filteredProfiles.filter((p) => {
      if (p.is_admin) return false;
      if (p.profile_completed !== true) return false;
      if (p.free_membership_contact_submitted !== true) return false; // excludes abandoned
      return p.previous_membership_level === "free" && p.membership_level === "founding";
    }).length;
  }, [filteredProfiles]);

  // waitlist → contributing (waitlist member who upgraded directly to contributing without approval)
  const waitlistToContributingCount = useMemo(() => {
    return filteredProfiles.filter((p) => {
      if (p.is_admin) return false;
      if (p.profile_completed !== true) return false;
      return p.previous_membership_level === "waitlist" && p.membership_level === "contributing";
    }).length;
  }, [filteredProfiles]);

  // waitlist → founding (waitlist member who upgraded directly to founding without approval)
  const waitlistToFoundingCount = useMemo(() => {
    return filteredProfiles.filter((p) => {
      if (p.is_admin) return false;
      if (p.profile_completed !== true) return false;
      return p.previous_membership_level === "waitlist" && p.membership_level === "founding";
    }).length;
  }, [filteredProfiles]);

  // contributing → founding (member who was already paying as contributing and upgraded to founding)
  const contributingToFoundingCount = useMemo(() => {
    return filteredProfiles.filter((p) => {
      if (p.is_admin) return false;
      if (p.profile_completed !== true) return false;
      return p.first_paid_level === "contributing" && p.membership_level === "founding";
    }).length;
  }, [filteredProfiles]);

  const estimatedMRR = useMemo(() => {
    return Math.round((contributingCount * 15 + foundingCount * 100) / 12);
  }, [contributingCount, foundingCount]);

  // Membership revenue (annual)
  const membershipRevenue = useMemo(() => {
    return contributingCount * 15 + foundingCount * 100;
  }, [contributingCount, foundingCount]);

  // Waterfall categories (mutually exclusive)
  // Admin count (separate, not in other categories)
  const adminCount = useMemo(() => {
    return filteredProfiles.filter((p) => p.is_admin === true).length;
  }, [filteredProfiles]);

  // Paid members (non-admin, completed profile) - for waterfall breakdown
  const paidMembersCount = useMemo(() => {
    return filteredProfiles.filter(
      (p) =>
        p.is_admin !== true &&
        (p.membership_level === "contributing" || p.membership_level === "founding") &&
        p.profile_completed === true
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
      (p) =>
        p.is_admin !== true &&
        p.profile_completed === true &&
        (
          (p.membership_level === "free" && p.is_approved_free_member === true) ||
          p.membership_level === "contributing" ||
          p.membership_level === "founding"
        )
    ).length;
  }, [filteredProfiles]);

  // Incomplete = profile not complete OR (free but never submitted contact form for free membership)
  const incompleteCount = useMemo(() => {
    return filteredProfiles.filter(
      (p) =>
        p.profile_completed !== true ||
        (p.membership_level === "free" &&
         p.is_approved_free_member !== true &&
         p.free_membership_contact_submitted === false)
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

  // Paid vs free percentage (based on filtered profiles)
  const paidPercent = useMemo(() => {
    const total = filteredProfiles.length;
    const paidFiltered = filteredProfiles.filter(
      (p) => p.membership_level === "contributing" || p.membership_level === "founding"
    ).length;
    return total > 0 ? Math.round((paidFiltered / total) * 100) : 0;
  }, [filteredProfiles]);

  const freePercent = useMemo(() => {
    const total = filteredProfiles.length;
    const freeFiltered = filteredProfiles.filter(
      (p) => p.membership_level === "free" && p.is_approved_free_member === true
    ).length;
    return total > 0 ? Math.round((freeFiltered / total) * 100) : 0;
  }, [filteredProfiles]);

  // Retention rate: members who joined 12+ months ago and still active
  const retentionRate = useMemo(() => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const oldMembers = profiles.filter((p) => {
      if (!p.joined_at) return false;
      return new Date(p.joined_at) <= twelveMonthsAgo;
    });

    if (oldMembers.length === 0) return 0;

    const retainedMembers = oldMembers.filter((p) => {
      // Still active if: paid with active status OR free with approved status
      if (p.membership_level === "free") {
        return p.is_approved_free_member === true;
      }
      return p.subscription_status === "active";
    });

    return Math.round((retainedMembers.length / oldMembers.length) * 100);
  }, [profiles]);

  // Churn: members who cancelled/expired in the period
  const churnCount = useMemo(() => {
    return profiles.filter((p) => {
      if (!p.subscription_ends_at) return false;
      // Churned if subscription ended in the period
      return isInRange(p.subscription_ends_at);
    }).length;
  }, [profiles, isInRange]);

  const churnRate = useMemo(() => {
    // Calculate based on members at start of period (12 months ago or period start)
    const periodStart = new Date();
    periodStart.setFullYear(periodStart.getFullYear() - 1);
    const membersAtStart = profiles.filter((p) => {
      if (!p.joined_at) return false;
      return new Date(p.joined_at) <= periodStart;
    }).length;

    return membersAtStart > 0 ? Math.round((churnCount / membersAtStart) * 100) : 0;
  }, [profiles, churnCount]);

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

  // Helper to check if grant's cycle is testing-only
  const isGrantTestingOnly = (g: Grant) => {
    const cycleTesting = cycleTestingMap.get(g.cycle_id);
    return cycleTesting === true;
  };

  const filteredGrants = useMemo(
    () =>
      grants.filter(
        (g) => g.submitted_at && isInRange(g.submitted_at) && !isGrantTestingOnly(g),
      ),
    [grants, isInRange, cycleTestingMap],
  );

  const grantsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    filteredGrants.forEach((g) => {
      const d = g.submitted_at!.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [filteredGrants]);

  const grantsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filteredGrants.forEach((g) => {
      let s = g.status || "unknown";
      // Map status values to display names
      if (s === "approved") s = "Approved";
      else if (s === "not_approved") s = "Not Approved";
      else if (s === "payment_pending") s = "Payment Pending";
      else if (s === "submitted") s = "Submitted";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredGrants]);

  const totalFunded = useMemo(
    () =>
      grants
        .filter((g) => g.status === "payment_sent" && isInRange(g.funded_at) && !isGrantTestingOnly(g))
        .reduce((sum, g) => sum + (g.amount_approved || 0), 0),
    [grants, isInRange, cycleTestingMap],
  );

  const approvalRate = useMemo(() => {
    const total = filteredGrants.length;
    const approvals = filteredGrants.filter((g) =>
      ["approved", "payment_sent"].includes(g.status || ""),
    ).length;
    return total > 0 ? Math.round((approvals / total) * 100) : 0;
  }, [filteredGrants]);

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
      redemptions.filter(
        (r) => r.created_at && isInRange(r.created_at),
      ),
    [redemptions, isInRange],
  );

  const redemptionsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRedemptions.forEach((r) => {
      const d = r.created_at!.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [filteredRedemptions]);

  const topOffers = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRedemptions.forEach((r) => {
      const key = r.store_name ? `${r.store_name}: ${r.offer_title || r.offer_key}` : (r.offer_title || r.offer_key || "Unknown");
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 25)
      .map(([offer, count]) => ({
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
          isInRange(c.claimed_at),
      ),
    [zdsClaims, isInRange],
  );

  // Date + success filtered (for stat boxes)
  const successfulZdsClaims = useMemo(
    () =>
      filteredZdsClaims.filter(
        (c) =>
          c.status === "fulfilled" || c.status === "delivered" || c.status === "completed",
      ),
    [filteredZdsClaims],
  );

  // All-time successful ZDS claims (for Total All Time box)
  const successfulZdsClaimsAllTime = useMemo(
    () =>
      zdsClaims.filter(
        (c) =>
          c.status === "fulfilled" || c.status === "delivered" || c.status === "completed",
      ),
    [zdsClaims],
  );

  // Unique ZDS claimants
  const uniqueZdsClaimants = useMemo(() => {
    return new Set(successfulZdsClaims.map((c) => c.user_id).filter(Boolean)).size;
  }, [successfulZdsClaims]);

  // ZDS claims by day
  const zdsClaimsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    successfulZdsClaims.forEach((c) => {
      const d = c.claimed_at!.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [filteredZdsClaims]);

  // Top ZDS products
  const topZdsProducts = useMemo(() => {
    const map: Record<string, number> = {};
    const productMap = new Map(shopifyProducts.map((p) => [p.shopify_product_id, p.title || "Unknown"]));

    filteredZdsClaims.forEach((c) => {
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
  }, [filteredZdsClaims, shopifyProducts]);

  // ZDS claims by status (excluding "created" - not a final state)
  const zdsClaimsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filteredZdsClaims.forEach((c) => {
      let s = c.status || "unknown";
      if (s !== "created") {
        // Map status values to display names
        if (s === "completed") s = "Completed";
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
        (r) => r.redeemed_at && isInRange(r.redeemed_at),
      ),
    [nfwPerkRedemptions, isInRange],
  );

  // Calculate unique active members (members with any activity in period)
  const activeMembers = useMemo(() => {
    const activeUserIds = new Set<string>();

    // From grants
    filteredGrants.forEach((g) => {
      // We don't have user_id in grants data directly, but we can infer from profiles
      // Actually, grants have user_id but it's not selected - skip for now
    });

    // From redemptions
    filteredRedemptions.forEach((r) => {
      if (r.user_id) activeUserIds.add(r.user_id);
    });

    // From ZDS claims
    filteredZdsClaims.forEach((c) => {
      if (c.user_id) activeUserIds.add(c.user_id);
    });

    // From NFW perk redemptions
    filteredNfwPerkRedemptions.forEach((r) => {
      if (r.user_id) activeUserIds.add(r.user_id);
    });

    return activeUserIds.size;
  }, [filteredGrants, filteredRedemptions, filteredZdsClaims, filteredNfwPerkRedemptions]);

  // Weekly active members (last 7 days)
  const weeklyActive = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();

    const activeUserIds = new Set<string>();

    filteredRedemptions.forEach((r) => {
      if (r.created_at && r.created_at >= weekAgoStr && r.user_id) {
        activeUserIds.add(r.user_id);
      }
    });

    filteredZdsClaims.forEach((c) => {
      if (c.claimed_at && c.claimed_at >= weekAgoStr && c.user_id) {
        activeUserIds.add(c.user_id);
      }
    });

    filteredNfwPerkRedemptions.forEach((r) => {
      if (r.redeemed_at && r.redeemed_at >= weekAgoStr && r.user_id) {
        activeUserIds.add(r.user_id);
      }
    });

    return activeUserIds.size;
  }, [filteredRedemptions, filteredZdsClaims, filteredNfwPerkRedemptions]);

  // Monthly active members (last 30 days)
  const monthlyActive = useMemo(() => {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString();

    const activeUserIds = new Set<string>();

    filteredRedemptions.forEach((r) => {
      if (r.created_at && r.created_at >= monthAgoStr && r.user_id) {
        activeUserIds.add(r.user_id);
      }
    });

    filteredZdsClaims.forEach((c) => {
      if (c.claimed_at && c.claimed_at >= monthAgoStr && c.user_id) {
        activeUserIds.add(c.user_id);
      }
    });

    filteredNfwPerkRedemptions.forEach((r) => {
      if (r.redeemed_at && r.redeemed_at >= monthAgoStr && r.user_id) {
        activeUserIds.add(r.user_id);
      }
    });

    return activeUserIds.size;
  }, [filteredRedemptions, filteredZdsClaims, filteredNfwPerkRedemptions]);

  // Total activities in period
  const totalActivities = useMemo(() => {
    return (
      filteredRedemptions.length +
      filteredZdsClaims.length +
      filteredNfwPerkRedemptions.length +
      filteredGrants.length
    );
  }, [filteredRedemptions, filteredZdsClaims, filteredNfwPerkRedemptions, filteredGrants]);

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
      if (!p.joined_at) return;
      const date = new Date(p.joined_at);
      const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!cohorts.has(key)) {
        cohorts.set(key, { total: 0, active: 0 });
      }
      const cohort = cohorts.get(key)!;
      cohort.total++;

      const isActive =
        p.subscription_status === 'active' ||
        p.subscription_status === 'contributing' ||
        p.is_approved_free_member === true;
      if (isActive) {
        cohort.active++;
      }
    });

    const rows: CohortRow[] = [];
    const sortedCohorts = Array.from(cohorts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const displayCohorts = sortedCohorts.slice(-12);

    displayCohorts.forEach(([key, data]) => {
      const date = new Date(key + '-01');
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const shortLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      rows.push({
        cohort: label,
        cohortShort: shortLabel,
        members: data.total,
        retained: data.active,
        retentionRate: data.total > 0 ? Math.round((data.active / data.total) * 100) : 0,
      });
    });

    return rows;
  }, [profiles]);

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
        ["Date", "New Members"],
        ...membersByDay.map((r) => [r.date, String(r.count)]),
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
        ...grantsByDay.map((r) => [r.date, String(r.count)]),
        [],
        ["Status", "Count"],
        ...grantsByStatus.map((r) => [r.name, String(r.value)]),
      ];
    } else if (tab === "zds") {
      filename = "nfw-zds-analytics.csv";
      rows = [
        ["Date", "Claims"],
        ...zdsClaimsByDay.map((r) => [r.date, String(r.count)]),
        [],
        ["Product", "Claims"],
        ...topZdsProducts.map((r) => [r.product, String(r.count)]),
      ];
    } else {
      filename = "nfw-perks-analytics.csv";
      rows = [
        ["Date", "Redemptions"],
        ...redemptionsByDay.map((r) => [r.date, String(r.count)]),
        [],
        ["Offer", "Redemptions"],
        ...topOffers.map((r) => [r.offer, String(r.count)]),
      ];
    }

    const csv = rows.map((r) => r.join(",")).join("\n");
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

    if (dateRange === "custom" && customStartDate && customEndDate) {
      params.set("start_date", customStartDate);
      params.set("end_date", customEndDate);
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
            label: "Membership Revenue",
            value: `$${membershipRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: "bg-nfw-wisteria",
            text: "text-white",
          },
          {
            label: "Retention Rate",
            value: `${retentionRate}%`,
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
            label: "Churn",
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
              label: "Approval Rate",
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
              value: filteredGrants.filter((g) => ["approved", "payment_sent"].includes(g.status || "")).length,
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
                label: "Redemptions",
                value: filteredRedemptions.length,
                icon: Gift,
                color: "bg-nfw-wisteria",
                text: "text-white",
              },
              {
                label: "Total All Time",
                value: redemptions.length,
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
                      color: "bg-nfw-wisteria",
                      text: "text-white",
                    },
                    {
                      label: "Active Members",
                      value: overallRetention.totalRetained,
                      icon: TrendingUp,
                      color: "bg-nfw-aubergine",
                      text: "text-white",
                    },
                    {
                      label: "Overall Retention",
                      value: `${overallRetention.rate}%`,
                      icon: TrendingUp,
                      color: "bg-nfw-wisteria",
                      text: "text-white",
                    },
                  ]
              : tab === "support"
                ? []
                : []

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        {/* Tabs */}
        <div className="flex gap-2">
          {(["members", "grants", "perks", "zds", "engagement", "cohorts", "support"] as const).map((t) => (
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

        <div className="flex gap-3 items-center flex-wrap">
          {/* Date Range Dropdown */}
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

          {/* Custom Date Range Pickers */}
          {dateRange === "custom" && (
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

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-nfw-blackberry/10 text-sm font-semibold text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>

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
                New Members Over Time
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
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3E145F"
                      strokeWidth={2}
                      dot={false}
                      name="New Members"
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
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-nfw-wisteria/10 p-4 text-center">
                  <div className="text-2xl font-black text-nfw-wisteria mb-1">
                    {freeToContributingCount}
                  </div>
                  <div className="text-xs font-semibold text-nfw-blackberry/60">
                    free → contributing
                  </div>
                </div>
                <div className="bg-nfw-wisteria/10 p-4 text-center">
                  <div className="text-2xl font-black text-nfw-wisteria mb-1">
                    {freeToFoundingCount}
                  </div>
                  <div className="text-xs font-semibold text-nfw-blackberry/60">
                    free → founding
                  </div>
                </div>
                <div className="bg-nfw-wisteria/10 p-4 text-center">
                  <div className="text-2xl font-black text-nfw-wisteria mb-1">
                    {waitlistToContributingCount}
                  </div>
                  <div className="text-xs font-semibold text-nfw-blackberry/60">
                    waitlist → contributing
                  </div>
                </div>
                <div className="bg-nfw-wisteria/10 p-4 text-center">
                  <div className="text-2xl font-black text-nfw-wisteria mb-1">
                    {waitlistToFoundingCount}
                  </div>
                  <div className="text-xs font-semibold text-nfw-blackberry/60">
                    waitlist → founding
                  </div>
                </div>
                <div className="bg-nfw-wisteria/10 p-4 text-center">
                  <div className="text-2xl font-black text-nfw-wisteria mb-1">
                    {contributingToFoundingCount}
                  </div>
                  <div className="text-xs font-semibold text-nfw-blackberry/60">
                    contributing → founding
                  </div>
                </div>
              </div>
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
                    <Tooltip />
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
                    <Tooltip />
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
                      dataKey="offer"
                      type="category"
                      tick={{ fontSize: 10 }}
                      width={200}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} redemptions`]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.offer || label}
                      contentStyle={{ maxWidth: '300px', wordBreak: 'break-word', whiteSpace: 'normal' }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#b2d1ee"
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
                    <Tooltip />
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
                        fill="#B693C0"
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
                    {profiles.length > 0 ? Math.round((activeMembers / profiles.length) * 100) : 0}%
                  </div>
                  <div className="text-xs font-semibold text-white/70">
                    Engagement Rate
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
                    {filteredRedemptions.length}
                  </div>
                  <div className="text-xs font-semibold text-nfw-blackberry/70">
                    Perk Redemptions
                  </div>
                </div>
                <div className="text-center p-4 bg-nfw-dove">
                  <div className="text-3xl font-black text-nfw-blackberry mb-1">
                    {filteredZdsClaims.length}
                  </div>
                  <div className="text-xs font-semibold text-nfw-blackberry/70">
                    ZDS Claims
                  </div>
                </div>
                <div className="text-center p-4 bg-nfw-dove">
                  <div className="text-3xl font-black text-nfw-blackberry mb-1">
                    {filteredNfwPerkRedemptions.length}
                  </div>
                  <div className="text-xs font-semibold text-nfw-blackberry/70">
                    NFW Perk Redemptions
                  </div>
                </div>
                <div className="text-center p-4 bg-nfw-dove">
                  <div className="text-3xl font-black text-nfw-blackberry mb-1">
                    {filteredGrants.length}
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
                Shows members grouped by the month they joined. Retention rate = members still active / total members in cohort.
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
                        <th className="text-right py-3 px-4 font-black text-nfw-blackberry">Active</th>
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
                    onClick={() => {
                      setFreshdeskStats(null);
                      setFreshdeskLoading(false);
                      setFreshdeskError(null);
                    }}
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
                  <p className="text-xs text-nfw-blackberry/50 text-center">
                    Data from Freshdesk. Cached for 5 minutes. Last updated:{" "}
                    {new Date().toLocaleTimeString()}
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
