"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw } from "lucide-react";

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  date: string;
  error_message: string | null;
}

interface BackfillStatus {
  id: string;
  email: string;
  status: "pending" | "processing" | "matched" | "not_found" | "error";
  stripe_customer_id: string | null;
  lifetime_value: number | null;
  error_message: string | null;
  processed_at: string | null;
  payment_count: number | null;
  total_amount: number | null;
  has_failed: boolean | null;
  has_refunded: boolean | null;
  latest_payment_date: string | null;
  latest_payment_status: string | null;
  latest_payment_amount: number | null;
  latest_payment_error: string | null;
  all_payments_json: PaymentRecord[] | null;
  payment_sync_at: string | null;
  profiles: {
    full_name: string | null;
    membership_level: string | null;
  };
}

interface StatusResponse {
  counts: {
    total: number;
    pending: number;
    processing: number;
    matched: number;
    not_found: number;
    error: number;
  };
  problemAccounts: {
    orphaned: number;
    duplicates: number;
    matchedWithoutPayment: number;
    unmatchedPayments: number;
  };
  matchedWithoutPaymentList: Array<{
    email: string;
    stripe_customer_id: string;
    membership_level: string;
  }>;
  unmatchedPaymentsList: Array<{
    email: string;
    user_id: string;
    amount: number;
  }>;
  rows: BackfillStatus[];
  totalToBackfill: number;
  initialized: boolean;
}

interface LiveStats {
  contributing: { count: number; revenue: number };
  founding: { count: number; revenue: number };
  total: { count: number; revenue: number };
}

interface ProblematicPayment {
  id: string;
  stripe_payment_id: string | null;
  amount: number;
  email: string;
  user_id: string;
  created_at: string;
  issue: "refunded" | "failed" | "not_found" | "missing_stripe_id";
  stripe_status: string | null;
}

interface ReconciliationSummary {
  stripe_live: {
    contributing: { count: number; total: number };
    founding: { count: number; total: number };
    total: { count: number; total: number };
  };
  our_db: {
    contributing: { count: number; total: number };
    founding: { count: number; total: number };
    total: { count: number; total: number };
  };
  difference: {
    contributing: { count: number; total: number };
    founding: { count: number; total: number };
    total: { count: number; total: number };
  };
}

interface ReconciliationResponse {
  summary: ReconciliationSummary;
  verified: { valid: number; refunded: number; failed: number; not_found: number };
  problematic_payments: ProblematicPayment[];
}

interface DuplicateEmail {
  email: string;
  count: number;
  rows: Array<{
    id: string;
    status: string;
    stripe_customer_id: string | null;
    lifetime_value: number | null;
    processed_at: string | null;
    error_message: string | null;
    full_name: string | null;
    membership_level: string | null;
  }>;
}

interface MemberSearchResult {
  error?: string;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    membership_level: string | null;
    subscription_status: string | null;
    stripe_customer_id: string | null;
    lifetime_value: number | null;
    joined_at: string | null;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    payment_type: string;
    stripe_payment_id: string | null;
    created_at: string;
  }>;
  backfillStatus: Array<{
    id: string;
    status: string;
    stripe_customer_id: string | null;
    lifetime_value: number | null;
    processed_at: string | null;
  }>;
  stripeSubscription: {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    amount: number;
    price_name: string;
  } | null;
  stripeDashboardUrl: string | null;
  subscriptionDashboardUrl: string | null;
}

interface MissingProfile {
  id: string;
  email: string;
  full_name: string | null;
  membership_level: string | null;
  stripe_customer_id: string | null;
  joined_at: string | null;
  has_stripe_id: boolean;
  stripeDashboardUrl: string | null;
}

export default function BackfillClient() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [message, setMessage] = useState<string>("");
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationResponse | null>(null);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [refreshingLive, setRefreshingLive] = useState(false);

  // Payment sync
  const [syncingPayments, setSyncingPayments] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>("");
  const [expandedPayments, setExpandedPayments] = useState<any | null>(null);
  const [syncingCustomerId, setSyncingCustomerId] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'database_only' | 'succeeded' | 'no_payment'>('all');
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);

  // Duplicate emails
  const [duplicates, setDuplicates] = useState<DuplicateEmail[]>([]);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [expandedDuplicate, setExpandedDuplicate] = useState<string | null>(null);

  // Member search
  const [memberSearchEmail, setMemberSearchEmail] = useState("");
  const [memberSearchResult, setMemberSearchResult] = useState<MemberSearchResult | null>(null);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);

  // Missing from backfill
  const [missingFromBackfill, setMissingFromBackfill] = useState<MissingProfile[]>([]);
  const [missingLoading, setMissingLoading] = useState(false);

  // Unmatched Stripe subscribers
  const [unmatchedSubscribers, setUnmatchedSubscribers] = useState<any[]>([]);
  const [unmatchedLoading, setUnmatchedLoading] = useState(false);
  const [unmatchedTotal, setUnmatchedTotal] = useState(0);

  // Gift code signups
  const [giftCodeProfiles, setGiftCodeProfiles] = useState<any[]>([]);
  const [giftCodeLoading, setGiftCodeLoading] = useState(false);

  // Sync missing payments
  const [syncMissingLoading, setSyncMissingLoading] = useState(false);
  const [syncMissingResult, setSyncMissingResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProblematicPayment | null>(null);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

  // Stripe Only
  const [stripeOnly, setStripeOnly] = useState<any[]>([]);
  const [stripeOnlyLoading, setStripeOnlyLoading] = useState(false);
  const [stripeOnlyTotal, setStripeOnlyTotal] = useState(0);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    setRefreshingStats(true);
    try {
      const res = await fetch("/api/admin/backfill/stripe/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setMessage("Stats refreshed successfully.");
      } else {
        setMessage(`Error refreshing stats: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
      setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setRefreshingStats(false);
    }
  }, []);

  // Fetch Stripe Only data
  const fetchStripeOnly = useCallback(async () => {
    setStripeOnlyLoading(true);
    try {
      const res = await fetch("/api/admin/backfill/stripe/stripe-only");
      if (res.ok) {
        const data = await res.json();
        setStripeOnly(data.charges || []);
        setStripeOnlyTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch Stripe Only:", error);
    } finally {
      setStripeOnlyLoading(false);
    }
  }, []);

  // Fetch live Stripe stats
  const fetchLiveStats = useCallback(async () => {
    setRefreshingLive(true);
    try {
      const res = await fetch("/api/admin/backfill/stripe/live-stats");
      if (res.ok) {
        const data = await res.json();
        setLiveStats(data);
        setMessage("Live Stripe data refreshed successfully.");
      } else {
        setMessage(`Error refreshing Stripe data: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      console.error("Failed to fetch live stats:", error);
      setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setRefreshingLive(false);
    }
  }, []);

  // Fetch reconciliation
  const fetchReconciliation = useCallback(async () => {
    setReconciliationLoading(true);
    try {
      const res = await fetch("/api/admin/backfill/stripe/reconcile");
      if (res.ok) {
        const data = await res.json();
        setReconciliation(data);
        sessionStorage.setItem("stripe_reconciliation", JSON.stringify(data));
      }
    } catch (error) {
      console.error("Failed to fetch reconciliation:", error);
    } finally {
      setReconciliationLoading(false);
    }
  }, []);

  // Load cached reconciliation on mount
  useEffect(() => {
    const cached = sessionStorage.getItem("stripe_reconciliation");
    if (cached) {
      try {
        setReconciliation(JSON.parse(cached));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  const handleExportCSV = () => {
    window.open("/api/admin/backfill/stripe/export", "_blank");
  };

  // Sync all payments from Stripe
  const handleSyncAllPayments = async () => {
    if (!confirm("This will sync payment details from Stripe for all matched customers. This may take ~2 minutes. Continue?")) {
      return;
    }
    setSyncingPayments(true);
    setSyncProgress("Starting payment sync...");
    try {
      const res = await fetch("/api/admin/backfill/stripe/sync-all-payments", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncProgress(`Complete: ${data.synced} synced, ${data.failed} failed`);
        fetchStatus(); // Refresh to show new data
      } else {
        setSyncProgress(`Error: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      setSyncProgress(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSyncingPayments(false);
    }
  };

  // Sync missing payments from Stripe
  const handleSyncMissingPayments = async () => {
    if (!confirm("This will query Stripe for ~85 contributing members who are missing payment records. Continue?")) {
      return;
    }
    setSyncMissingLoading(true);
    setSyncMissingResult(null);
    try {
      const res = await fetch("/api/admin/backfill/stripe/sync-missing-payments", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncMissingResult(data.results || { success: 0, failed: 0, errors: [] });
      } else {
        setSyncMissingResult({ success: 0, failed: 0, errors: [data.error || "Unknown error"] });
      }
    } catch (error) {
      setSyncMissingResult({ success: 0, failed: 0, errors: [error instanceof Error ? error.message : "Unknown error"] });
    } finally {
      setSyncMissingLoading(false);
    }
  };

  const handleUnmatchedSubscribers = async () => {
    setLoading(true);
    setMessage("Finding unmatched Stripe subscribers...");
    try {
      const res = await fetch("/api/admin/backfill/stripe/unmatched-subscribers", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Found ${data.count} unmatched active subscribers totaling $${data.total_amount.toFixed(2)}`);
      } else {
        setMessage(data.error || "Failed to find unmatched subscribers");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleExportUnmatchedCSV = () => {
    window.open("/api/admin/backfill/stripe/unmatched-subscribers/export", "_blank");
  };

  // Fetch duplicates
  const fetchDuplicates = useCallback(async () => {
    setDuplicatesLoading(true);
    try {
      const res = await fetch("/api/admin/backfill/stripe/duplicates");
      if (res.ok) {
        const data = await res.json();
        setDuplicates(data.duplicates || []);
      }
    } catch (error) {
      console.error("Failed to fetch duplicates:", error);
    } finally {
      setDuplicatesLoading(false);
    }
  }, []);

  // Fetch missing from backfill
  const fetchMissingFromBackfill = useCallback(async () => {
    setMissingLoading(true);
    try {
      const res = await fetch("/api/admin/backfill/stripe/missing-from-backfill");
      if (res.ok) {
        const data = await res.json();
        setMissingFromBackfill(data.profiles || []);
      }
    } catch (error) {
      console.error("Failed to fetch missing profiles:", error);
    } finally {
      setMissingLoading(false);
    }
  }, []);

  // Backfill missing profiles to stripe_backfill_status
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{
    synced?: number;
    notFound?: number;
    withStripeId?: number;
    errors?: number;
    message?: string;
  } | null>(null);

  const handleBackfillMissing = async () => {
    if (!confirm("This will look up all missing paid members in Stripe and add them to stripe_backfill_status. Continue?")) {
      return;
    }
    setBackfillLoading(true);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/admin/backfill/stripe/backfill-existing", {
        method: "POST",
      });
      const data = await res.json();
      setBackfillResult(data);
      if (data.success) {
        // Refresh all data
        fetchStatus();
        fetchLiveStats();
        fetchDuplicates();
        fetchMissingFromBackfill();
        fetchGiftCodes();
      }
    } catch (error) {
      console.error("Backfill failed:", error);
      setBackfillResult({ message: "Backfill failed: " + (error instanceof Error ? error.message : "Unknown error") });
    } finally {
      setBackfillLoading(false);
    }
  };

  // Fetch unmatched Stripe subscribers
  const fetchUnmatchedSubscribers = useCallback(async () => {
    setUnmatchedLoading(true);
    try {
      const res = await fetch("/api/admin/backfill/stripe/unmatched-subscribers", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setUnmatchedSubscribers(data.subscriptions || []);
        setUnmatchedTotal(data.count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch unmatched subscribers:", error);
    } finally {
      setUnmatchedLoading(false);
    }
  }, []);

  // Fetch gift code signups
  const fetchGiftCodes = useCallback(async () => {
    setGiftCodeLoading(true);
    try {
      const res = await fetch("/api/admin/backfill/stripe/gift-codes");
      if (res.ok) {
        const data = await res.json();
        setGiftCodeProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error("Failed to fetch gift codes:", error);
    } finally {
      setGiftCodeLoading(false);
    }
  }, []);

  // Fetch member by email
  const handleMemberSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberSearchEmail.trim()) return;

    setMemberSearchLoading(true);
    try {
      const encodedEmail = encodeURIComponent(memberSearchEmail.trim());
      const res = await fetch(`/api/admin/backfill/stripe/member/${encodedEmail}`);
      if (res.ok) {
        const data = await res.json();
        setMemberSearchResult(data);
      } else if (res.status === 404) {
        setMemberSearchResult({ error: "Member not found" } as any);
      } else {
        setMemberSearchResult({ error: "Failed to fetch member" } as any);
      }
    } catch (error) {
      setMemberSearchResult({ error: "Network error" } as any);
    } finally {
      setMemberSearchLoading(false);
    }
  };

  // Check if initialized on mount
  useEffect(() => {
    fetchStatus();
    fetchLiveStats();
    fetchDuplicates();
    fetchMissingFromBackfill();
    fetchGiftCodes();
    fetchStripeOnly();
  }, [fetchStatus, fetchLiveStats, fetchDuplicates, fetchMissingFromBackfill, fetchGiftCodes, fetchStripeOnly]);

  // Delete single payment
  const handleDeletePayment = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/admin/backfill/stripe/payments/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessage(`Deleted payment: $${deleteTarget.amount} (${deleteTarget.email})`);
        await fetchReconciliation();
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to delete payment");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  // Bulk delete payments
  const handleBulkDelete = async () => {
    if (bulkDeleteIds.length === 0) return;

    try {
      const res = await fetch("/api/admin/backfill/stripe/payments/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: bulkDeleteIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(`Deleted ${data.deleted} payment(s)`);
        setBulkDeleteIds([]);
        await fetchReconciliation();
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to delete payments");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setBulkDeleteModalOpen(false);
    }
  };

  const { counts, rows, initialized, problemAccounts, unmatchedPaymentsList } = status || {
    counts: { total: 0, pending: 0, processing: 0, matched: 0, not_found: 0, error: 0 },
    problemAccounts: { orphaned: 0, duplicates: 0, unmatchedPayments: 0 },
    unmatchedPaymentsList: [],
    rows: [],
    initialized: false,
  };

  const processedCount = counts.matched + counts.not_found + counts.error;
  const progressPercent = counts.total > 0 ? (processedCount / counts.total) * 100 : 0;

  // Get problematic payments for bulk delete
  const refundedPayments = reconciliation?.problematic_payments.filter(p => p.issue === "refunded" || p.issue === "failed") || [];

  return (
    <div className="space-y-6">
      {/* Reconciliation Comparison */}
      <div className="bg-white rounded-lg p-6 border border-nfw-aubergine/20">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-ui font-bold text-nfw-aubergine">Reconciliation</h3>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleSyncMissingPayments}
              disabled={syncMissingLoading}
              className="text-sm bg-nfw-wisteria text-white px-3 py-1 rounded hover:bg-nfw-wisteria/90 disabled:opacity-50"
            >
              {syncMissingLoading ? "Syncing..." : "Sync Missing Payments"}
            </button>
            <button
              onClick={fetchReconciliation}
              disabled={reconciliationLoading}
              className="text-sm bg-nfw-aubergine text-white px-3 py-1 rounded hover:bg-nfw-aubergine/90 disabled:opacity-50"
            >
              {reconciliationLoading ? "Loading..." : "Refresh Reconciliation"}
            </button>
          </div>
        </div>

        {syncMissingResult && (
          <div className={`mb-4 p-3 rounded text-sm font-ui ${
            syncMissingResult.failed === 0
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-yellow-50 border border-yellow-200 text-yellow-700"
          }`}>
            {syncMissingResult.failed === 0 ? "✓" : "⚠"} Synced {syncMissingResult.success} payments
            {syncMissingResult.failed > 0 && `, ${syncMissingResult.failed} failed`}
            {syncMissingResult.errors.length > 0 && (
              <button
                onClick={() => {
                  setErrorModalMessage(syncMissingResult.errors.join("\n"));
                  setErrorModalOpen(true);
                }}
                className="ml-2 underline hover:no-underline"
              >
                View Errors
              </button>
            )}
          </div>
        )}

        {reconciliation && (
          <>
            {/* Comparison Table */}
            <div className="overflow-hidden rounded-lg border border-nfw-dove mb-4">
              <table className="w-full">
                <thead className="bg-nfw-aubergine/5">
                  <tr>
                    <th className="text-left px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Metric</th>
                    <th className="text-center px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Stripe Live</th>
                    <th className="text-center px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Our DB</th>
                    <th className="text-center px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nfw-dove">
                  <tr className="hover:bg-nfw-dove/30">
                    <td className="px-4 py-3 font-ui text-sm font-semibold">Contributing ($15)</td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-aubergine font-bold">{reconciliation.summary.stripe_live.contributing.count}</span>
                      <span className="text-nfw-blackberry/50"> / </span>
                      <span className="text-nfw-aubergine font-bold">${reconciliation.summary.stripe_live.contributing.total.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-aubergine font-bold">{reconciliation.summary.our_db.contributing.count}</span>
                      <span className="text-nfw-blackberry/50"> / </span>
                      <span className="text-nfw-aubergine font-bold">${reconciliation.summary.our_db.contributing.total.toLocaleString()}</span>
                    </td>
                    <td className={`px-4 py-3 text-center font-ui text-sm font-bold ${
                      reconciliation.summary.difference.contributing.total === 0 ? "text-green-600" :
                      reconciliation.summary.difference.contributing.total > 0 ? "text-red-600" : "text-orange-600"
                    }`}>
                      {reconciliation.summary.difference.contributing.count > 0 ? "+" : ""}
                      {reconciliation.summary.difference.contributing.count} /&nbsp;
                      {reconciliation.summary.difference.contributing.total > 0 ? "+$" : reconciliation.summary.difference.contributing.total < 0 ? "-$" : ""}
                      {Math.abs(reconciliation.summary.difference.contributing.total).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="hover:bg-nfw-dove/30">
                    <td className="px-4 py-3 font-ui text-sm font-semibold">Founding ($100)</td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-aubergine font-bold">{reconciliation.summary.stripe_live.founding.count}</span>
                      <span className="text-nfw-blackberry/50"> / </span>
                      <span className="text-nfw-aubergine font-bold">${reconciliation.summary.stripe_live.founding.total.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-aubergine font-bold">{reconciliation.summary.our_db.founding.count}</span>
                      <span className="text-nfw-blackberry/50"> / </span>
                      <span className="text-nfw-aubergine font-bold">${reconciliation.summary.our_db.founding.total.toLocaleString()}</span>
                    </td>
                    <td className={`px-4 py-3 text-center font-ui text-sm font-bold ${
                      reconciliation.summary.difference.founding.total === 0 ? "text-green-600" :
                      reconciliation.summary.difference.founding.total > 0 ? "text-red-600" : "text-orange-600"
                    }`}>
                      {reconciliation.summary.difference.founding.count > 0 ? "+" : ""}
                      {reconciliation.summary.difference.founding.count} /&nbsp;
                      {reconciliation.summary.difference.founding.total > 0 ? "+$" : reconciliation.summary.difference.founding.total < 0 ? "-$" : ""}
                      {Math.abs(reconciliation.summary.difference.founding.total).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="bg-nfw-aubergine/5 hover:bg-nfw-aubergine/10">
                    <td className="px-4 py-3 font-ui text-sm font-bold">Total</td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-aubergine font-bold">{reconciliation.summary.stripe_live.total.count}</span>
                      <span className="text-nfw-blackberry/50"> / </span>
                      <span className="text-nfw-aubergine font-bold">${reconciliation.summary.stripe_live.total.total.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-aubergine font-bold">{reconciliation.summary.our_db.total.count}</span>
                      <span className="text-nfw-blackberry/50"> / </span>
                      <span className="text-nfw-aubergine font-bold">${reconciliation.summary.our_db.total.total.toLocaleString()}</span>
                    </td>
                    <td className={`px-4 py-3 text-center font-ui text-sm font-bold ${
                      reconciliation.summary.difference.total.total === 0 ? "text-green-600" :
                      reconciliation.summary.difference.total.total > 0 ? "text-red-600" : "text-orange-600"
                    }`}>
                      {reconciliation.summary.difference.total.count > 0 ? "+" : ""}
                      {reconciliation.summary.difference.total.count} /&nbsp;
                      {reconciliation.summary.difference.total.total > 0 ? "+$" : reconciliation.summary.difference.total.total < 0 ? "-$" : ""}
                      {Math.abs(reconciliation.summary.difference.total.total).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Verified counts */}
            <div className="flex gap-4 text-xs text-nfw-blackberry/60">
              <span>✓ Valid: {reconciliation.verified.valid}</span>
              <span className="text-red-600">✗ Refunded: {reconciliation.verified.refunded}</span>
              <span className="text-red-600">✗ Failed: {reconciliation.verified.failed}</span>
              <span className="text-yellow-600">? Database Only: {reconciliation.verified.not_found}</span>
            </div>
          </>
        )}

        {!reconciliation && !reconciliationLoading && (
          <p className="text-nfw-blackberry/60 font-ui text-sm">
            Click &quot;Refresh Reconciliation&quot; to compare Stripe live data against our database.
          </p>
        )}
      </div>

      {/* Problematic Payments Table */}
      {reconciliation && reconciliation.problematic_payments.length > 0 && (
        <div className="bg-white rounded-lg border border-nfw-aubergine/20 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-nfw-dove">
            <h3 className="font-ui font-bold text-nfw-aubergine">
              Problematic Payments ({reconciliation.problematic_payments.length})
            </h3>
            {refundedPayments.length > 0 && (
              <button
                onClick={() => {
                  setBulkDeleteIds(refundedPayments.map(p => p.id));
                  setBulkDeleteModalOpen(true);
                }}
                className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Delete All Refunded ({refundedPayments.length})
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nfw-aubergine/5">
                <tr>
                  <th className="text-left px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Email</th>
                  <th className="text-right px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Amount</th>
                  <th className="text-left px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Charge ID</th>
                  <th className="text-left px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Date</th>
                  <th className="text-center px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Issue</th>
                  <th className="text-center px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Stripe Status</th>
                  <th className="text-center px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nfw-dove">
                {reconciliation.problematic_payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className={`hover:bg-nfw-dove/30 ${
                      payment.issue === "refunded" || payment.issue === "failed"
                        ? "bg-red-50/50"
                        : "bg-yellow-50/50"
                    }`}
                  >
                    <td className="px-4 py-3 font-ui text-sm">{payment.email}</td>
                    <td className="px-4 py-3 font-ui text-sm text-right font-bold">${payment.amount}</td>
                    <td className="px-4 py-3 font-ui text-sm font-mono text-xs">
                      {payment.stripe_payment_id || "—"}
                    </td>
                    <td className="px-4 py-3 font-ui text-sm">
                      {new Date(payment.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        payment.issue === "refunded"
                          ? "bg-red-100 text-red-700"
                          : payment.issue === "failed"
                          ? "bg-red-100 text-red-700"
                          : payment.issue === "not_found"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {payment.issue === "missing_stripe_id" ? "Missing Stripe ID" : payment.issue}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      {payment.stripe_status || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setDeleteTarget(payment);
                          setDeleteModalOpen(true);
                        }}
                        className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stripe Only Section */}
      <div className="bg-white rounded-lg border border-nfw-aubergine/20 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-nfw-dove">
          <div>
            <h3 className="font-ui font-bold text-nfw-aubergine">
              Stripe Only ({stripeOnly.length})
            </h3>
            <p className="text-xs text-nfw-blackberry/60 mt-1">
              Charges in Stripe not matched to any DB payment • Total: ${stripeOnlyTotal.toFixed(2)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchStripeOnly}
              disabled={stripeOnlyLoading}
              className="text-sm bg-nfw-wisteria text-white px-3 py-1 rounded hover:bg-nfw-wisteria/90 disabled:opacity-50"
            >
              {stripeOnlyLoading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={() => window.open("/api/admin/backfill/stripe/stripe-only/export", "_blank")}
              className="text-sm bg-nfw-lilac text-white px-3 py-1 rounded hover:bg-nfw-lilac/90"
            >
              Export CSV
            </button>
            <button
              onClick={() => window.open("/api/admin/backfill/stripe/all-transactions/export", "_blank")}
              className="text-sm bg-nfw-aubergine text-white px-3 py-1 rounded hover:bg-nfw-aubergine/90"
            >
              Download All Stripe Transactions CSV
            </button>
          </div>
        </div>
        {stripeOnly.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nfw-aubergine/5">
                <tr>
                  <th className="text-left px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Email</th>
                  <th className="text-right px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Amount</th>
                  <th className="text-left px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Charge ID</th>
                  <th className="text-left px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Customer ID</th>
                  <th className="text-left px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Date</th>
                  <th className="text-center px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Matched By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nfw-dove">
                {stripeOnly.map((charge) => (
                  <tr key={charge.charge_id} className="hover:bg-nfw-dove/30">
                    <td className="px-4 py-3 font-ui text-sm">{charge.email || "—"}</td>
                    <td className="px-4 py-3 font-ui text-sm text-right font-bold">${charge.amount}</td>
                    <td className="px-4 py-3 font-ui text-sm font-mono text-xs">
                      <a
                        href={`https://dashboard.stripe.com/payments/${charge.charge_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nfw-aubergine hover:underline"
                      >
                        {charge.charge_id.slice(0, 20)}...
                      </a>
                    </td>
                    <td className="px-4 py-3 font-ui text-sm font-mono text-xs">{charge.customer_id?.slice(0, 20)}...</td>
                    <td className="px-4 py-3 font-ui text-sm">
                      {new Date(charge.created).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        charge.matched_by ? "bg-yellow-100 text-yellow-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {charge.matched_by || "No Match"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-nfw-blackberry/50 font-ui text-sm">
            {stripeOnlyLoading ? "Loading..." : "No Stripe Only charges found"}
          </div>
        )}
      </div>

      {/* Live Stripe Stats */}
      {liveStats && (
        <div className="bg-white rounded-lg p-6 border border-nfw-aubergine/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-ui font-bold text-nfw-aubergine">Live Stripe Subscriptions</h3>
            <button
              onClick={fetchLiveStats}
              disabled={refreshingLive}
              className="text-sm bg-nfw-wisteria text-white px-3 py-1 rounded hover:bg-nfw-wisteria/90 disabled:opacity-50 flex items-center gap-1"
            >
              {refreshingLive ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Refreshing...
                </>
              ) : (
                "Refresh"
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-nfw-wisteria/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-nfw-aubergine">${liveStats.contributing.revenue.toLocaleString()}</div>
              <div className="text-sm text-nfw-blackberry/60">Contributing ($15/mo)</div>
              <div className="text-xs text-nfw-blackberry/40 mt-1">{liveStats.contributing.count} active</div>
            </div>
            <div className="bg-nfw-citrine/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-nfw-aubergine">${liveStats.founding.revenue.toLocaleString()}</div>
              <div className="text-sm text-nfw-blackberry/60">Founding ($100)</div>
              <div className="text-xs text-nfw-blackberry/40 mt-1">{liveStats.founding.count} active</div>
            </div>
            <div className="bg-nfw-aubergine/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-nfw-aubergine">${liveStats.total.revenue.toLocaleString()}</div>
              <div className="text-sm text-nfw-blackberry/60">Total Revenue</div>
              <div className="text-xs text-nfw-blackberry/40 mt-1">{liveStats.total.count} subscribers</div>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="bg-nfw-aubergine/10 border border-nfw-aubergine/30 rounded-lg p-4 font-ui text-sm whitespace-pre-wrap">
          {message}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={fetchStatus}
          disabled={refreshingStats}
          className="bg-nfw-wisteria text-white font-ui font-bold px-6 py-3 rounded-lg hover:bg-nfw-wisteria/90 disabled:opacity-50 flex items-center gap-2"
        >
          {refreshingStats ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            "Refresh Stats"
          )}
        </button>
        <button
          onClick={handleExportCSV}
          className="bg-nfw-lilac text-white font-ui font-bold px-6 py-3 rounded-lg hover:bg-nfw-lilac/90"
        >
          Export CSV
        </button>
        <button
          onClick={handleUnmatchedSubscribers}
          disabled={loading}
          className="bg-nfw-aubergine text-white font-ui font-bold px-6 py-3 rounded-lg hover:bg-nfw-aubergine/90 disabled:opacity-50"
        >
          View Unmatched Subscribers
        </button>
        <button
          onClick={handleExportUnmatchedCSV}
          disabled={loading}
          className="bg-nfw-blackberry text-white font-ui font-bold px-6 py-3 rounded-lg hover:bg-nfw-blackberry/90 disabled:opacity-50"
        >
          Export Unmatched CSV
        </button>
        <button
          onClick={handleSyncAllPayments}
          disabled={syncingPayments}
          className="bg-nfw-citrine text-nfw-blackberry font-ui font-bold px-6 py-3 rounded-lg hover:bg-nfw-citrine/90 disabled:opacity-50"
        >
          {syncingPayments ? "Syncing Payments..." : "Sync All Payments"}
        </button>
      </div>

      {/* Sync Progress */}
      {syncProgress && (
        <div className="bg-nfw-citrine/20 border border-nfw-citrine/30 rounded-lg p-4 font-ui text-sm">
          {syncProgress}
        </div>
      )}

      {/* Clean Stats Cards - Distinct Email Counts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Users" value={counts.total} color="aubergine" />
        <StatCard label="Matched" value={counts.matched} color="green" />
        <StatCard label="Not Found" value={counts.not_found} color="citrine" />
        <StatCard label="Errors" value={counts.error} color="red" />
        <StatCard label="Problem Accounts" value={problemAccounts.unmatchedPayments} color="orange" />
      </div>

      {/* Problem Accounts Section */}
      {(problemAccounts.unmatchedPayments > 0 || problemAccounts.orphaned > 0 || problemAccounts.duplicates > 0) && (
        <div className="bg-white rounded-lg border border-orange-200 overflow-hidden">
          <div className="p-4 border-b border-nfw-dove bg-orange-50">
            <h3 className="font-ui font-bold text-orange-700">Problem Accounts</h3>
            <p className="text-xs text-orange-600 mt-1">
              Data quality issues found during backfill. The reconciliation tab compares Stripe vs DB payments.
            </p>
          </div>

          {/* Unmatched Payments - THESE ARE REAL PROBLEMS */}
          {unmatchedPaymentsList && unmatchedPaymentsList.length > 0 && (
            <div className="p-4 border-b border-nfw-dove">
              <h4 className="font-ui font-semibold text-sm text-nfw-aubergine mb-2">
                Payments Not in Backfill Status ({unmatchedPaymentsList.length})
              </h4>
              <div className="space-y-2">
                {unmatchedPaymentsList.map((payment) => (
                  <div key={payment.user_id} className="flex items-center justify-between text-sm bg-nfw-dove/30 rounded p-2">
                    <div>
                      <span className="font-mono text-xs">{payment.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-nfw-aubergine">${payment.amount.toFixed(2)}</span>
                      <span className="text-xs text-orange-600">Not in backfill</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Quality Summary */}
          <div className="p-4 bg-nfw-dove/20">
            <div className="flex gap-6 text-xs">
              {problemAccounts.orphaned > 0 && (
                <span className="text-orange-600">
                  ⚠ {problemAccounts.orphaned} orphaned row(s) with NULL profile_id
                </span>
              )}
              {problemAccounts.duplicates > 0 && (
                <span className="text-orange-600">
                  ⚠ {problemAccounts.duplicates} duplicate email(s) (before cleanup)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Member Search Section */}
      <div className="bg-white rounded-lg border border-nfw-aubergine/20 p-4">
        <h3 className="font-ui font-bold text-nfw-aubergine mb-4">Search Member by Email</h3>
        <form onSubmit={handleMemberSearch} className="flex gap-2">
          <input
            type="email"
            value={memberSearchEmail}
            onChange={(e) => setMemberSearchEmail(e.target.value)}
            placeholder="member@example.com"
            className="flex-1 border border-nfw-aubergine/20 rounded px-3 py-2 font-ui text-sm"
          />
          <button
            type="submit"
            disabled={memberSearchLoading}
            className="bg-nfw-aubergine text-white font-ui font-bold px-4 py-2 rounded hover:bg-nfw-aubergine/90 disabled:opacity-50"
          >
            {memberSearchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </button>
        </form>

        {memberSearchResult && !memberSearchResult.error && (
          <div className="mt-4 p-4 bg-nfw-dove/50 rounded-lg">
            {memberSearchResult.profile ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-bold">Name:</span>
                  <span>{memberSearchResult.profile.full_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Tier:</span>
                  <span>{memberSearchResult.profile.membership_level || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Status:</span>
                  <span>{memberSearchResult.profile.subscription_status || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Stripe Customer:</span>
                  <span className="font-mono text-xs">{memberSearchResult.profile.stripe_customer_id || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Lifetime Value:</span>
                  <span>${(memberSearchResult.profile.lifetime_value || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Backfill Status:</span>
                  <span>{memberSearchResult.backfillStatus?.[0]?.status || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Stripe Subscription:</span>
                  <span>{memberSearchResult.stripeSubscription?.status || "—"}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  {memberSearchResult.stripeDashboardUrl && (
                    <a
                      href={memberSearchResult.stripeDashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-nfw-aubergine text-white px-3 py-1 rounded hover:bg-nfw-aubergine/90"
                    >
                      Stripe Customer →
                    </a>
                  )}
                  {memberSearchResult.subscriptionDashboardUrl && (
                    <a
                      href={memberSearchResult.subscriptionDashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-nfw-wisteria text-white px-3 py-1 rounded hover:bg-nfw-wisteria/90"
                    >
                      Stripe Subscription →
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-nfw-blackberry/70">No profile found for this email.</p>
            )}
          </div>
        )}

        {memberSearchResult?.error && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <p className="text-red-600 text-sm">{memberSearchResult.error}</p>
          </div>
        )}
      </div>

      {/* Missing from Backfill Section */}
      {missingFromBackfill.length > 0 && (
        <div className="bg-white rounded-lg border border-orange-200 overflow-hidden">
          <div className="p-4 border-b border-nfw-dove bg-orange-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-ui font-bold text-orange-700">Missing from Backfill ({missingFromBackfill.length})</h3>
                <p className="text-xs text-orange-600 mt-1">
                  Paid profiles NOT in stripe_backfill_status. Manual review needed.
                </p>
              </div>
              <button
                onClick={handleBackfillMissing}
                disabled={backfillLoading}
                className="px-3 py-1.5 bg-orange-500 text-white text-xs font-ui font-semibold rounded hover:bg-orange-600 disabled:opacity-50"
              >
                {backfillLoading ? "Syncing..." : "Sync All to Stripe"}
              </button>
            </div>
            {backfillResult && (
              <div className="mt-2 p-2 bg-orange-100 rounded text-xs">
                <p className="font-semibold">Last sync result:</p>
                <p>{backfillResult.message}</p>
                {backfillResult.synced !== undefined && (
                  <p>Matched: {backfillResult.synced}, Not found: {backfillResult.notFound}, Errors: {backfillResult.errors}</p>
                )}
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {missingFromBackfill.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between text-sm bg-nfw-dove/30 rounded p-2">
                  <div>
                    <span className="font-mono text-xs">{profile.email}</span>
                    <span className="ml-2 text-xs text-nfw-blackberry/50">
                      {profile.membership_level} • {profile.has_stripe_id ? "Has Stripe ID" : "No Stripe ID"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {profile.stripeDashboardUrl && (
                      <a
                        href={profile.stripeDashboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-nfw-aubergine hover:underline"
                      >
                        Stripe →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gift Code Signups Section */}
      {giftCodeProfiles.length > 0 && (
        <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
          <div className="p-4 border-b border-nfw-dove bg-green-50">
            <h3 className="font-ui font-bold text-green-700">Gift Code Signups ({giftCodeProfiles.length})</h3>
            <p className="text-xs text-green-600 mt-1">
              Members who joined via gift codes.
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {giftCodeProfiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between text-sm bg-nfw-dove/30 rounded p-2">
                  <div>
                    <span className="font-mono text-xs">{profile.email}</span>
                    <span className="ml-2 text-xs text-nfw-blackberry/50">
                      {profile.membership_level} • {profile.gift_code_redeemed ? "Gift Redeemed" : "Gift Source"}
                      {profile.redemption?.code && ` • Code: ${profile.redemption.code.slice(0, 8)}...`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {profile.stripe_customer_id && (
                      <a
                        href={`https://dashboard.stripe.com/connect/accounts/${profile.stripe_customer_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-nfw-aubergine hover:underline"
                      >
                        Stripe →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Emails Section */}
      {duplicates.length > 0 && (
        <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
          <div className="p-4 border-b border-nfw-dove bg-purple-50">
            <h3 className="font-ui font-bold text-purple-700">Duplicate Emails ({duplicates.length})</h3>
            <p className="text-xs text-purple-600 mt-1">
              Multiple backfill rows with same email. Click to expand.
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {duplicates.map((dup) => (
                <div key={dup.email} className="border border-nfw-dove rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedDuplicate(expandedDuplicate === dup.email ? null : dup.email)}
                    className="w-full flex items-center justify-between p-3 bg-nfw-dove/30 hover:bg-nfw-dove/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">{dup.email}</span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        {dup.count} rows
                      </span>
                    </div>
                    <span className="text-xs text-nfw-blackberry/50">
                      {expandedDuplicate === dup.email ? "▲" : "▼"}
                    </span>
                  </button>
                  {expandedDuplicate === dup.email && (
                    <div className="p-3 bg-white border-t border-nfw-dove">
                      <table className="w-full text-xs">
                        <thead className="bg-nfw-dove/30">
                          <tr>
                            <th className="text-left p-2">Profile ID</th>
                            <th className="text-left p-2">Name</th>
                            <th className="text-left p-2">Tier</th>
                            <th className="text-left p-2">Stripe ID</th>
                            <th className="text-left p-2">LTV</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Processed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-nfw-dove/50">
                          {dup.rows.map((row) => (
                            <tr key={row.id}>
                              <td className="p-2 font-mono">{row.id.slice(0, 8)}...</td>
                              <td className="p-2">{row.full_name || "—"}</td>
                              <td className="p-2">{row.membership_level || "—"}</td>
                              <td className="p-2 font-mono">{row.stripe_customer_id?.slice(0, 12) || "—"}...</td>
                              <td className="p-2">${(row.lifetime_value || 0).toFixed(2)}</td>
                              <td className="p-2">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="p-2">{row.processed_at ? new Date(row.processed_at).toLocaleDateString() : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unmatched Stripe Subscribers Section */}
      {unmatchedSubscribers.length > 0 && (
        <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
          <div className="p-4 border-b border-nfw-dove bg-blue-50">
            <h3 className="font-ui font-bold text-blue-700">Unmatched Stripe Subscribers ({unmatchedTotal})</h3>
            <p className="text-xs text-blue-600 mt-1">
              Active Stripe subscriptions NOT in our database. These may be duplicates or need manual review.
            </p>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-nfw-dove/30 sticky top-0">
                <tr>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Customer ID</th>
                  <th className="text-left p-2">Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nfw-dove/50">
                {unmatchedSubscribers.map((sub) => (
                  <tr key={sub.subscription_id}>
                    <td className="p-2 font-mono">{sub.email || "—"}</td>
                    <td className="p-2">{sub.name || "—"}</td>
                    <td className="p-2 text-right font-bold">${sub.amount.toFixed(2)}</td>
                    <td className="p-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        sub.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-2 font-mono">
                      <a
                        href={`https://dashboard.stripe.com/customers/${sub.customer_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nfw-aubergine hover:underline"
                      >
                        {sub.customer_id.slice(0, 14)}...
                      </a>
                    </td>
                    <td className="p-2">{sub.current_period_start?.split("T")[0] || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {initialized && counts.total > 0 && (
        <div className="bg-white rounded-lg p-4 border border-nfw-aubergine/20">
          <div className="flex justify-between text-sm font-ui mb-2">
            <span>Progress</span>
            <span>{processedCount} / {counts.total} ({progressPercent.toFixed(1)}%)</span>
          </div>
          <div className="h-3 bg-nfw-dove rounded-full overflow-hidden">
            <div
              className="h-full bg-nfw-aubergine transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Results Table */}
      {(() => {
        const filteredRows = rows.filter(row => {
          if (paymentFilter === 'all') return true;
          if (paymentFilter === 'database_only') return row.status === 'not_found';
          if (paymentFilter === 'succeeded') return (row.payment_count || 0) > 0 && !row.has_failed;
          if (paymentFilter === 'no_payment') return row.has_failed && row.total_amount === 0;
          return true;
        });
        return initialized && filteredRows.length > 0 && (
        <div className="bg-white rounded-lg border border-nfw-aubergine/20 overflow-hidden">
          {/* Payment Filter Buttons */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-nfw-dove bg-nfw-dove/20">
            <span className="text-xs text-nfw-blackberry/60 font-ui mr-1">Filter:</span>
            {(['all', 'database_only', 'succeeded', 'no_payment'] as const).map((f) => {
              const labelMap = {
                all: "All",
                database_only: "Database Only",
                succeeded: "Succeeded",
                no_payment: "No Payment"
              };
              const countMap = {
                all: rows.length,
                database_only: rows.filter(r => r.status === 'not_found').length,
                succeeded: rows.filter(r => (r.payment_count || 0) > 0 && !r.has_failed).length,
                no_payment: rows.filter(r => r.has_failed && r.total_amount === 0).length
              };
              return (
                <button
                  key={f}
                  onClick={() => setPaymentFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    paymentFilter === f
                      ? "bg-nfw-blackberry text-white"
                      : "bg-nfw-stone/20 text-nfw-blackberry hover:bg-nfw-stone/30"
                  }`}
                >
                  {labelMap[f]} ({countMap[f]})
                </button>
              );
            })}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nfw-aubergine/5">
                <tr>
                  <th className="text-left px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Email</th>
                  <th className="text-left px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Name</th>
                  <th className="text-left px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Tier</th>
                  <th className="text-left px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Status</th>
                  <th className="text-center px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">#Pmts</th>
                  <th className="text-left px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Last Payment</th>
                  <th className="text-right px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nfw-dove">
                {filteredRows.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr className={`hover:bg-nfw-dove/50 ${row.has_failed && row.total_amount === 0 ? "border-l-4 border-red-500" : ""}`}>
                      <td className="px-4 py-3 font-ui text-sm">{row.email}</td>
                      <td className="px-4 py-3 font-ui text-sm">{row.profiles?.full_name || "—"}</td>
                      <td className="px-4 py-3 font-ui text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          row.profiles?.membership_level === "founding"
                            ? "bg-nfw-citrine text-nfw-blackberry"
                            : "bg-nfw-wisteria/20 text-nfw-wisteria"
                        }`}>
                          {row.profiles?.membership_level || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-ui text-sm">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {row.payment_count != null && row.payment_count > 0 ? (
                            <button
                              onClick={() => setExpandedPayments(expandedPayments?.id === row.id ? null : row)}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                                expandedPayments?.id === row.id ? "bg-nfw-aubergine text-white" :
                                row.has_failed ? "bg-red-100 text-red-700" :
                                row.has_refunded ? "bg-orange-100 text-orange-700" :
                                "bg-nfw-wisteria/20 text-nfw-wisteria"
                              }`}
                            >
                              {row.payment_count}
                            </button>
                          ) : (
                            <span className="text-nfw-blackberry/30">—</span>
                          )}
                          {row.stripe_customer_id && (
                            <>
                              <a
                                href={`https://dashboard.stripe.com/customers/${row.stripe_customer_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold border border-nfw-aubergine/30 text-nfw-aubergine hover:bg-nfw-aubergine/10"
                                title="View customer in Stripe"
                              >
                                S
                              </a>
                              <button
                                onClick={async () => {
                                  setSyncingCustomerId(row.id);
                                  try {
                                    const res = await fetch(`/api/admin/backfill/stripe/sync-customer/${row.id}`, { method: "POST" });
                                    if (res.ok) {
                                      // Refetch status to get updated data
                                      const statusRes = await fetch("/api/admin/backfill/stripe/status");
                                      if (statusRes.ok) {
                                        const statusData = await statusRes.json();
                                        setStatus(statusData);
                                      }
                                    }
                                  } finally {
                                    setSyncingCustomerId(null);
                                  }
                                }}
                                disabled={syncingCustomerId !== null}
                                className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold border border-nfw-aubergine/30 text-nfw-aubergine hover:bg-nfw-aubergine/10 disabled:opacity-50"
                                title="Sync payments"
                              >
                                {syncingCustomerId === row.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-ui text-sm">
                        {row.latest_payment_status ? (
                          <div className="flex flex-col">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold w-fit ${
                              row.latest_payment_status === "signup" ? "bg-green-100 text-green-700" :
                              row.latest_payment_status === "renewal" ? "bg-blue-100 text-blue-700" :
                              row.latest_payment_status === "upgrade" ? "bg-purple-100 text-purple-700" :
                              row.latest_payment_status === "failed" ? "bg-red-100 text-red-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>
                              {row.latest_payment_status}
                            </span>
                            {row.latest_payment_amount && (
                              <span className="text-xs text-nfw-blackberry/60 mt-0.5">
                                ${row.latest_payment_amount.toFixed(2)}
                              </span>
                            )}
                            {row.latest_payment_date && (
                              <span className="text-xs text-nfw-blackberry/40">
                                {new Date(row.latest_payment_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-nfw-blackberry/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-ui text-sm text-right">
                        {row.total_amount != null
                          ? (
                            <span className={row.total_amount === 0 && row.payment_count && row.payment_count > 0 ? "text-red-600 line-through font-bold" : ""}>
                              ${row.total_amount.toFixed(2)}
                            </span>
                          )
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.status === "error" && row.error_message && (
                          <button
                            onClick={() => {
                              setErrorModalMessage(row.error_message);
                              setErrorModalOpen(true);
                            }}
                            className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-600 hover:bg-red-200 font-bold"
                            title="View error"
                          >
                            !
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedPayments?.id === row.id && (
                      <tr key={`${row.id}-accordion`} className="bg-nfw-dove/20">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="space-y-2">
                            {(() => {
                              const raw = expandedPayments?.all_payments_json;
                              const payments = (typeof raw === 'string' ? JSON.parse(raw) : raw) || [];
                              return payments.map((payment: any) => (
                                <div key={payment.id} className={`flex items-center justify-between p-2 rounded ${
                                  payment.status === "failed" ? "bg-red-50 border border-red-200" :
                                  payment.status === "refunded" ? "bg-orange-50 border border-orange-200" :
                                  "bg-white"
                                }`}>
                                  <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                      (payment.payment_type || payment.billing_reason) === "signup" || payment.billing_reason === "subscription_create" ? "bg-green-100 text-green-700" :
                                      (payment.payment_type || payment.billing_reason) === "renewal" || payment.billing_reason === "subscription_cycle" ? "bg-blue-100 text-blue-700" :
                                      (payment.payment_type || payment.billing_reason) === "upgrade" || payment.billing_reason === "subscription_update" ? "bg-purple-100 text-purple-700" :
                                      "bg-gray-100 text-gray-700"
                                    }`}>
                                      {payment.payment_type || payment.billing_reason || (payment.id?.startsWith("ch_") ? "charge" : "payment")}
                                    </span>
                                    <span className="font-ui text-sm font-bold">${payment.amount.toFixed(2)}</span>
                                    <span className="font-ui text-xs text-nfw-blackberry/60">
                                      {new Date(payment.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                    {payment.status && payment.status !== "paid" && (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                        payment.status === "failed" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                                      }`}>
                                        {payment.status}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs font-mono text-nfw-blackberry/40">
                                    {payment.stripe_invoice_id || payment.id}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      })()}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-ui font-bold text-nfw-aubergine text-lg mb-4">Confirm Delete</h3>
            <p className="font-ui text-sm text-nfw-blackberry/70 mb-6">
              Are you sure you want to delete this payment?
            </p>
            <div className="bg-nfw-dove/50 rounded p-3 mb-6">
              <div className="text-sm"><strong>Email:</strong> {deleteTarget.email}</div>
              <div className="text-sm"><strong>Amount:</strong> ${deleteTarget.amount}</div>
              <div className="text-sm"><strong>Issue:</strong> {deleteTarget.issue}</div>
              <div className="text-sm"><strong>Stripe Status:</strong> {deleteTarget.stripe_status || "—"}</div>
            </div>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 font-ui text-sm text-nfw-blackberry/70 hover:text-nfw-blackberry"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePayment}
                className="px-4 py-2 bg-red-600 text-white font-ui text-sm rounded hover:bg-red-700"
              >
                Delete Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-ui font-bold text-nfw-aubergine text-lg mb-4">Confirm Bulk Delete</h3>
            <p className="font-ui text-sm text-nfw-blackberry/70 mb-6">
              Are you sure you want to delete {bulkDeleteIds.length} payment(s)? This action cannot be undone.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  setBulkDeleteModalOpen(false);
                  setBulkDeleteIds([]);
                }}
                className="px-4 py-2 font-ui text-sm text-nfw-blackberry/70 hover:text-nfw-blackberry"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white font-ui text-sm rounded hover:bg-red-700"
              >
                Delete {bulkDeleteIds.length} Payments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-ui font-bold text-red-600 text-lg mb-4">Error Details</h3>
            <div className="max-h-96 overflow-y-auto mb-4">
              <p className="font-mono text-sm bg-red-50 p-3 rounded border border-red-200 whitespace-pre-wrap">
                {errorModalMessage}
              </p>
            </div>
            <button
              onClick={() => setErrorModalOpen(false)}
              className="mt-4 px-4 py-2 bg-nfw-aubergine text-white rounded font-ui text-sm hover:bg-nfw-aubergine/90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    aubergine: "bg-nfw-aubergine/10 border-nfw-aubergine/30",
    wisteria: "bg-nfw-wisteria/10 border-nfw-wisteria/30",
    green: "bg-[#d4f1ad]/30 border-[#d4f1ad]/50",
    citrine: "bg-nfw-citrine/30 border-nfw-citrine/50",
    red: "bg-red-50 border-red-200",
    blue: "bg-blue-50 border-blue-200",
  };

  return (
    <div className={`rounded-lg p-4 border ${colorClasses[color] || colorClasses.aubergine}`}>
      <div className="text-2xl font-bold font-serif text-nfw-aubergine">{value}</div>
      <div className="text-xs font-ui text-nfw-blackberry/60 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    processing: "bg-blue-50 text-blue-600",
    matched: "bg-[#d4f1ad]/30 text-green-700",
    not_found: "bg-nfw-citrine/30 text-nfw-blackberry/70",
    error: "bg-red-50 text-red-600",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${styles[status] || styles.pending}`}>
      {status.replace("_", " ")}
    </span>
  );
}
