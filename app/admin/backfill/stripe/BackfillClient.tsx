"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { getCategory } from "@/lib/member-categories";

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
    profile_completed: boolean | null;
    free_membership_contact_submitted: boolean | null;
    is_approved_free_member: boolean | null;
    is_admin: boolean | null;
    signup_source: string | null;
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
    contributing: { count: number; total: number; true_total?: number };
    founding: { count: number; total: number; true_total?: number };
    total: { count: number; total: number; true_total?: number };
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
  missing_from_db?: string[];
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

interface StripeDuplicateSubscription {
  subscription_id: string;
  customer_id: string;
  tier: string;
  amount: number;
  status: string;
  current_period_start: number;
  current_period_end: number;
}

interface StripeDuplicate {
  email: string;
  count: number;
  subscriptions: StripeDuplicateSubscription[];
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

interface MissingAccount {
  email: string;
  name: string;
  stripe_customer_id: string;
  subscription_id: string;
  amount: number;
  interval: string;
  current_period_start: string;
  status: string;
  profile_id: string | null;
  backfill_status: string | null;
}

interface MissingPaymentsResponse {
  contributing: MissingAccount[];
  founding: MissingAccount[];
  summary: {
    contributing_count: number;
    founding_count: number;
    total_count: number;
  };
}

export default function BackfillClient() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [message, setMessage] = useState<string>("");
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationResponse | null>(null);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [verifyPaymentsLoading, setVerifyPaymentsLoading] = useState(false);
  const [ourDb, setOurDb] = useState<{ contributing: { count: number; total: number }; founding: { count: number; total: number }; total: { count: number; total: number } } | null>(null);

  // Compute difference: ourDb - stripe_live
  const difference = useMemo(() => {
    if (!ourDb || !reconciliation?.summary?.stripe_live) return null;
    const stripe = reconciliation.summary.stripe_live;
    return {
      contributing: {
        count: ourDb.contributing.count - stripe.contributing.count,
        total: ourDb.contributing.total - stripe.contributing.total,
      },
      founding: {
        count: ourDb.founding.count - stripe.founding.count,
        total: ourDb.founding.total - stripe.founding.total,
      },
      total: {
        count: ourDb.total.count - stripe.total.count,
        total: ourDb.total.total - stripe.total.total,
      },
    };
  }, [ourDb, reconciliation]);

  const [refreshingStats, setRefreshingStats] = useState(false);
  const [refreshingLive, setRefreshingLive] = useState(false);

  // Payment sync
  const [syncingPayments, setSyncingPayments] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>("");
  const [expandedPayments, setExpandedPayments] = useState<any | null>(null);
  const [syncingCustomerId, setSyncingCustomerId] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'database_only' | 'succeeded' | 'no_payment' | 'paid_database_only' | 'paid_db_only' | 'gift_card'>('all');
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);

  // Duplicate emails
  const [duplicates, setDuplicates] = useState<DuplicateEmail[]>([]);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [expandedDuplicate, setExpandedDuplicate] = useState<string | null>(null);

  // Duplicates in Stripe
  const [stripeDuplicates, setStripeDuplicates] = useState<StripeDuplicate[]>([]);
  const [stripeDuplicatesLoading, setStripeDuplicatesLoading] = useState(false);
  const [expandedStripeDuplicate, setExpandedStripeDuplicate] = useState<string | null>(null);

  // Member search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Debounce the actual filter by 300ms
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  // Missing from backfill
  const [missingFromBackfill, setMissingFromBackfill] = useState<MissingProfile[]>([]);
  const [missingLoading, setMissingLoading] = useState(false);

  // Gift code signups
  const [giftCodeProfiles, setGiftCodeProfiles] = useState<any[]>([]);
  const [giftCodeLoading, setGiftCodeLoading] = useState(false);

  // Missing from DB (Stripe subscriptions not in membership_payments)
  const [missingPayments, setMissingPayments] = useState<MissingPaymentsResponse | null>(null);
  const [missingPaymentsLoading, setMissingPaymentsLoading] = useState(false);
  const [missingPaymentsAction, setMissingPaymentsAction] = useState<{ id: string; action: string } | null>(null);

  // Sync missing payments
  const [syncMissingLoading, setSyncMissingLoading] = useState(false);
  const [syncMissingResult, setSyncMissingResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  // Sync All button
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState({ current: 0, total: 0 });

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProblematicPayment | null>(null);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

  // Stripe Only
  const [stripeOnly, setStripeOnly] = useState<any[]>([]);
  const [stripeOnlyLoading, setStripeOnlyLoading] = useState(false);
  const [stripeOnlyTotal, setStripeOnlyTotal] = useState(0);
  const [stripeOnlyGeneratedAt, setStripeOnlyGeneratedAt] = useState<number | null>(null);

  // Export Email CSV
  const [exportCsvLoading, setExportCsvLoading] = useState(false);
  const [exportCsvReady, setExportCsvReady] = useState(false);
  const [exportCsvGeneratedAt, setExportCsvGeneratedAt] = useState<number | null>(null);

  // Load cached Stripe Only data on mount
  useEffect(() => {
    const cached = sessionStorage.getItem("stripeOnlyCharges");
    const cachedTotal = sessionStorage.getItem("stripeOnlyTotal");
    const cachedGeneratedAt = sessionStorage.getItem("stripeOnlyGeneratedAt");
    if (cached) {
      try {
        setStripeOnly(JSON.parse(cached));
        setStripeOnlyTotal(cachedTotal ? parseFloat(cachedTotal) : 0);
        setStripeOnlyGeneratedAt(cachedGeneratedAt ? parseInt(cachedGeneratedAt) : null);
      } catch {
        // ignore
      }
    }
  }, []);

  // Load cached Export Email CSV data
  useEffect(() => {
    const cached = sessionStorage.getItem("exportEmailCsv");
    const cachedGeneratedAt = sessionStorage.getItem("exportEmailCsvGeneratedAt");
    if (cached && cachedGeneratedAt) {
      setExportCsvReady(true);
      setExportCsvGeneratedAt(parseInt(cachedGeneratedAt));
    }
  }, []);

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

  // Trigger Stripe Only job (creates job in queue, returns immediately)
  const triggerStripeOnlyJob = useCallback(async () => {
    setStripeOnlyLoading(true);
    try {
      const res = await fetch("/api/admin/backfill/stripe/stripe-only-jobs", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        // Start polling for results
        pollStripeOnlyJob(data.jobId);
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error || res.statusText}`);
        setStripeOnlyLoading(false);
      }
    } catch (error) {
      console.error("Failed to trigger stripe-only:", error);
      setStripeOnlyLoading(false);
    }
  }, []);

  // Poll for stripe-only job completion
  const pollStripeOnlyJob = useCallback(async (jobId: string) => {
    const maxPolls = 120;
    let polls = 0;

    const poll = async () => {
      if (polls >= maxPolls) {
        setMessage("Stripe Only polling timed out. Check back in a few minutes.");
        setStripeOnlyLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/admin/backfill/stripe/stripe-only-jobs?jobId=${jobId}`);
        if (res.ok) {
          const data = await res.json();

          if (data.status === "completed") {
            setStripeOnly(data.charges || []);
            setStripeOnlyTotal(data.total || 0);
            setStripeOnlyGeneratedAt(Date.now());
            // Store in sessionStorage for export
            sessionStorage.setItem("stripeOnlyCharges", JSON.stringify(data.charges || []));
            sessionStorage.setItem("stripeOnlyTotal", String(data.total || 0));
            sessionStorage.setItem("stripeOnlyGeneratedAt", String(Date.now()));
            setMessage(`Stripe Only generated: ${data.total} charges`);
            setStripeOnlyLoading(false);
          } else if (data.status === "failed") {
            setMessage(`Job failed: ${data.error}`);
            setStripeOnlyLoading(false);
          } else {
            polls++;
            setTimeout(poll, 2000);
          }
        } else {
          setMessage(`Error polling job: ${res.status}`);
          setStripeOnlyLoading(false);
        }
      } catch (error) {
        console.error("Poll error:", error);
        polls++;
        setTimeout(poll, 2000);
      }
    };

    poll();
  }, []);

  // Legacy: Fetch Stripe Only data (now uses job polling)
  const fetchStripeOnly = useCallback(async () => {
    await triggerStripeOnlyJob();
  }, [triggerStripeOnlyJob]);

  // Download Stripe Only CSV from cache
  const downloadStripeOnlyCSV = useCallback(() => {
    const cached = sessionStorage.getItem("stripeOnlyCharges");
    if (!cached) {
      alert("No cached data. Please click 'Generate CSV' first.");
      return;
    }
    const charges = JSON.parse(cached);
    const headers = ["Email", "Full Name", "Tier", "Status", "Charge ID", "Customer ID", "Amount", "Currency", "Date"];
    const rows = charges.map((c: any) => [
      c.email || "",
      c.name || "",
      c.tier || "",
      c.status || "",
      c.charge_id || "",
      c.customer_id || "",
      c.amount || 0,
      c.currency || "",
      c.created || "",
    ]);
    const csv = [headers, ...rows].map((row: string[]) => row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stripe-only-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Export Email CSV
  const handleExportEmailCsv = useCallback(async () => {
    setExportCsvLoading(true);
    try {
      const res = await fetch("/api/admin/backfill/stripe/reconcile?format=csv");
      if (res.ok) {
        const csv = await res.text();
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `email-reconciliation-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setExportCsvLoading(false);
      } else {
        alert("Failed to generate CSV: " + res.statusText);
        setExportCsvLoading(false);
      }
    } catch (error) {
      console.error("Failed to export CSV:", error);
      alert("Failed to generate CSV");
      setExportCsvLoading(false);
    }
  }, []);

  // Trigger Stripe Live Stats job (creates job in queue, returns immediately)
  const triggerLiveStatsJob = useCallback(async () => {
    setRefreshingLive(true);
    setMessage("Creating background job...");
    try {
      const res = await fetch("/api/admin/backfill/stripe/stripe-live", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMessage(`Job ${data.jobId} created. Polling for results...`);
        // Start polling for results
        pollLiveStatsJob(data.jobId);
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error || res.statusText}`);
        setRefreshingLive(false);
      }
    } catch (error) {
      console.error("Failed to trigger live stats:", error);
      setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setRefreshingLive(false);
    }
  }, []);

  // Poll for live stats job completion
  const pollLiveStatsJob = useCallback(async (jobId: string) => {
    const maxPolls = 120; // 2 minutes max (cron runs every 5 min, but we'll poll faster)
    let polls = 0;

    const poll = async () => {
      if (polls >= maxPolls) {
        setMessage("Polling timed out. Check back in a few minutes.");
        setRefreshingLive(false);
        return;
      }

      try {
        const res = await fetch(`/api/admin/backfill/stripe/stripe-live?jobId=${jobId}`);
        if (res.ok) {
          const data = await res.json();

          if (data.status === "completed") {
            // Job done! Extract stripe_live from response
            if (data.stripeLive) {
              const stripeLive = data.stripeLive;
              setLiveStats({
                contributing: { count: stripeLive.contributing.count, revenue: stripeLive.contributing.total },
                founding: { count: stripeLive.founding.count, revenue: stripeLive.founding.total },
                total: { count: stripeLive.total.count, revenue: stripeLive.total.total },
              });
            }
            setMessage("Live Stripe data refreshed successfully.");
          } else if (data.status === "failed") {
            setMessage(`Job failed: ${data.error}`);
          } else {
            // Still pending/processing, keep polling
            setMessage(`Processing... ${data.progress || data.status}`);
            polls++;
            setTimeout(poll, 2000); // Poll every 2 seconds
          }
        } else {
          setMessage(`Error polling job: ${res.status}`);
          setRefreshingLive(false);
        }
      } catch (error) {
        console.error("Poll error:", error);
        polls++;
        setTimeout(poll, 2000);
      }
    };

    poll();
  }, []);

  // Legacy: Fetch live Stripe stats (now uses job polling)
  const fetchLiveStats = useCallback(async () => {
    await triggerLiveStatsJob();
  }, [triggerLiveStatsJob]);

  // Fetch reconciliation - uses background job + polling
  const fetchReconciliation = useCallback(async () => {
    setReconciliationLoading(true);
    setMessage("Creating background job...");

    try {
      // 1. Create a stripe_live job (same job type used by fetchLiveStats)
      const createRes = await fetch("/api/admin/backfill/stripe/stripe-live", { method: "POST" });
      if (!createRes.ok) {
        const err = await createRes.json();
        setMessage(`Error creating job: ${err.error || createRes.statusText}`);
        setReconciliationLoading(false);
        return;
      }
      const { jobId } = await createRes.json();
      setMessage(`Job ${jobId} created. Polling for results...`);

      // 2. Poll for job completion
      const maxPolls = 120; // 2 minutes max
      let polls = 0;

      const poll = async () => {
        if (polls >= maxPolls) {
          setMessage("Polling timed out. Check back in a few minutes.");
          setReconciliationLoading(false);
          return;
        }

        try {
          const statusRes = await fetch(`/api/admin/backfill/stripe/stripe-live?jobId=${jobId}`);
          if (!statusRes.ok) {
            setMessage(`Error polling job: ${statusRes.status}`);
            setReconciliationLoading(false);
            return;
          }
          const status = await statusRes.json();

          if (status.status === "completed") {
            setMessage("Background job complete. Fetching reconciliation...");

            // 3. Job done - now fetch reconciliation (cache will be valid)
            const reconRes = await fetch("/api/admin/backfill/stripe/reconcile");
            if (reconRes.ok) {
              const data = await reconRes.json();
              setReconciliation(data);
              sessionStorage.setItem("stripe_reconciliation", JSON.stringify(data));
              setMessage("Reconciliation refreshed successfully.");
            } else {
              setMessage(`Error fetching reconciliation: ${reconRes.status}`);
            }
            setReconciliationLoading(false);
            return;
          } else if (status.status === "failed") {
            setMessage(`Job failed: ${status.error}`);
            setReconciliationLoading(false);
            return;
          } else {
            // Still pending/processing, keep polling
            setMessage(`Processing... ${status.progress || status.status}`);
            polls++;
            setTimeout(poll, 2000);
          }
        } catch (error) {
          console.error("Poll error:", error);
          polls++;
          setTimeout(poll, 2000);
        }
      };

      poll();
    } catch (error) {
      console.error("Failed to fetch reconciliation:", error);
      setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setReconciliationLoading(false);
    }
  }, []);

  // Fetch Our DB (fast, no Stripe calls)
  const fetchOurDb = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/backfill/stripe/our-db");
      if (res.ok) {
        const data = await res.json();
        console.log("[Our DB] Response:", data);
        setOurDb(data.our_db);
      } else {
        console.error("[Our DB] Error:", res.status, await res.text());
      }
    } catch (error) {
      console.error("Failed to fetch Our DB:", error);
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

  // Verify Payments - triggers background job for payment verification
  const handleVerifyPayments = useCallback(async () => {
    setVerifyPaymentsLoading(true);
    setMessage("Creating payment verification job...");

    try {
      const createRes = await fetch("/api/admin/backfill/stripe/verify-payments", { method: "POST" });
      if (!createRes.ok) {
        const err = await createRes.json();
        setMessage(`Error creating job: ${err.error || createRes.statusText}`);
        setVerifyPaymentsLoading(false);
        return;
      }
      const { jobId } = await createRes.json();
      setMessage(`Job ${jobId} created. Processing payments (this may take several minutes)...`);

      // Poll for completion
      const maxPolls = 300; // 10 minutes max
      let polls = 0;

      const poll = async () => {
        if (polls >= maxPolls) {
          setMessage("Polling timed out. Payment verification may still be processing.");
          setVerifyPaymentsLoading(false);
          return;
        }

        try {
          const statusRes = await fetch(`/api/admin/backfill/stripe/verify-payments?jobId=${jobId}`);
          if (!statusRes.ok) {
            setMessage(`Error polling job: ${statusRes.status}`);
            setVerifyPaymentsLoading(false);
            return;
          }
          const status = await statusRes.json();

          if (status.status === "completed") {
            setMessage("Payment verification complete. Refreshing reconciliation...");
            
            // Fetch updated reconciliation
            const reconRes = await fetch("/api/admin/backfill/stripe/reconcile");
            if (reconRes.ok) {
              const data = await reconRes.json();
              setReconciliation(data);
              sessionStorage.setItem("stripe_reconciliation", JSON.stringify(data));
            }
            
            setVerifyPaymentsLoading(false);
            setMessage("Payment verification complete.");
            return;
          } else if (status.status === "failed") {
            setMessage(`Job failed: ${status.error}`);
            setVerifyPaymentsLoading(false);
            return;
          }

          polls++;
          setTimeout(poll, 2000); // Poll every 2 seconds
        } catch (error) {
          console.error("Poll error:", error);
          setMessage(`Poll error: ${error instanceof Error ? error.message : "Unknown error"}`);
          setVerifyPaymentsLoading(false);
        }
      };

      poll();
    } catch (error) {
      console.error("Failed to verify payments:", error);
      setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setVerifyPaymentsLoading(false);
    }
  }, []);

  // Delete Cache - deletes all reconciliation cache and triggers fresh jobs
  const handleDeleteCache = useCallback(async () => {
    if (!confirm("Are you sure you want to delete all cached data? This will trigger fresh Stripe data fetches.")) {
      return;
    }

    setMessage("Deleting cache and triggering fresh jobs...");

    try {
      // Delete all cache entries
      const deleteRes = await fetch("/api/admin/backfill/stripe/verify-payments", { method: "DELETE" });
      if (!deleteRes.ok) {
        const err = await deleteRes.json();
        setMessage(`Error deleting cache: ${err.error || deleteRes.statusText}`);
        return;
      }

      // Trigger fresh jobs
      await triggerLiveStatsJob();
      
      setMessage("Cache deleted. Fresh jobs triggered. Data will refresh automatically.");
    } catch (error) {
      console.error("Failed to delete cache:", error);
      setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [triggerLiveStatsJob]);

  const handleExportCSV = () => {
    window.open("/api/admin/backfill/stripe/export", "_blank");
  };

  const handleExportFilteredCSV = () => {
    const headers = [
      "Email",
      "Full Name",
      "Tier",
      "Status",
      "# Payments",
      "Last Payment Date",
      "Lifetime Value"
    ];

    const csvRows = [headers.join(",")];

    for (const row of filteredRows) {
      const values = [
        row.email || "",
        row.profiles?.full_name || "",
        row.profiles?.membership_level || "",
        row.status || "",
        row.payment_count != null ? row.payment_count.toString() : "",
        row.latest_payment_date ? new Date(row.latest_payment_date).toLocaleDateString() : "",
        row.lifetime_value != null ? row.lifetime_value.toFixed(2) : ""
      ];
      const escaped = values.map(v => {
        const str = String(v);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      });
      csvRows.push(escaped.join(","));
    }

    const csv = csvRows.join("\n");
    const dateStr = new Date().toISOString().split("T")[0];
    const filterNames = {
      all: "all",
      database_only: "database-only",
      succeeded: "succeeded",
      no_payment: "no-payment",
      paid_database_only: "paid-database-only",
      paid_db_only: "paid-db-only",
      gift_card: "gift-card"
    };
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stripe-backfill-${filterNames[paymentFilter]}-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  // Fetch duplicates in Stripe
  const fetchStripeDuplicates = useCallback(async () => {
    setStripeDuplicatesLoading(true);
    try {
      const res = await fetch("/api/admin/backfill/stripe/stripe-duplicates");
      if (res.ok) {
        const data = await res.json();
        setStripeDuplicates(data.duplicates || []);
      }
    } catch (error) {
      console.error("Failed to fetch stripe duplicates:", error);
    } finally {
      setStripeDuplicatesLoading(false);
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

  // Fetch missing from DB (Stripe subscriptions not in membership_payments)
  const fetchMissingPayments = useCallback(async () => {
    setMissingPaymentsLoading(true);
    try {
      const res = await fetch("/api/admin/backfill/stripe/missing-payments");
      if (res.ok) {
        const data = await res.json();
        setMissingPayments(data);
      }
    } catch (error) {
      console.error("Failed to fetch missing payments:", error);
    } finally {
      setMissingPaymentsLoading(false);
    }
  }, []);

  // Sync All missing payments - insert them into membership_payments
  const handleSyncAll = async () => {
    const accounts = [
      ...(missingPayments?.contributing || []),
      ...(missingPayments?.founding || []),
    ];
    if (!confirm(`This will insert payment records for ${accounts.length} accounts that have profiles. Continue?`)) {
      return;
    }
    setSyncingAll(true);
    setSyncAllProgress({ current: 0, total: accounts.length });
    try {
      const res = await fetch("/api/admin/backfill/stripe/insert-missing-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Sync complete: ${data.message}`);
        // Re-fetch both endpoints
        await Promise.all([fetchMissingPayments(), fetchReconciliation()]);
      } else {
        alert(`Sync failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Sync All failed:", error);
      alert("Sync All failed");
    } finally {
      setSyncingAll(false);
      setSyncAllProgress({ current: 0, total: 0 });
    }
  };

  // Re-match a missing account
  const handleRematch = async (account: MissingAccount) => {
    if (!account.profile_id) return;
    setMissingPaymentsAction({ id: account.stripe_customer_id, action: "rematch" });
    try {
      const res = await fetch("/api/admin/backfill/stripe/rematch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: account.profile_id,
          stripe_customer_id: account.stripe_customer_id,
          email: account.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Re-matched: ${data.message}`);
        fetchMissingPayments();
        fetchReconciliation();
      } else {
        alert(`Failed to re-match: ${data.message}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setMissingPaymentsAction(null);
    }
  };

  // Sync a single missing account
  const handleSyncSingle = async (account: MissingAccount) => {
    if (!account.profile_id) return;
    setMissingPaymentsAction({ id: account.stripe_customer_id, action: "sync" });
    try {
      const res = await fetch("/api/admin/backfill/stripe/sync-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: account.profile_id,
          stripe_customer_id: account.stripe_customer_id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Synced: ${data.message}`);
        fetchMissingPayments();
        fetchReconciliation();
        fetchStatus();
      } else {
        alert(`Failed to sync: ${data.message}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setMissingPaymentsAction(null);
    }
  };

  // Sync by email lookup (for accounts where profile_id is null but profile exists by email)
  const handleSyncByEmail = async (account: MissingAccount) => {
    if (!account.email) return;
    setMissingPaymentsAction({ id: account.stripe_customer_id, action: "sync-email" });
    try {
      const res = await fetch("/api/admin/backfill/stripe/sync-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: account.email,
          stripe_customer_id: account.stripe_customer_id,
          amount: account.amount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Synced: ${data.message}`);
        fetchMissingPayments();
        fetchReconciliation();
        fetchStatus();
      } else {
        alert(`Failed to sync: ${data.message}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setMissingPaymentsAction(null);
    }
  };

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

  // Check if initialized on mount (removed automatic Stripe calls - now manual only)
  useEffect(() => {
    fetchStatus();
    fetchDuplicates();
    fetchStripeDuplicates();
    fetchMissingFromBackfill();
    fetchGiftCodes();
    fetchMissingPayments();
    fetchOurDb();
  }, [fetchStatus, fetchDuplicates, fetchStripeDuplicates, fetchMissingFromBackfill, fetchGiftCodes, fetchMissingPayments, fetchOurDb]);

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

  // Get problematic payments for bulk delete
  const refundedPayments = reconciliation?.problematic_payments.filter(p => p.issue === "refunded" || p.issue === "failed") || [];

  // Compute filtered rows - require at least 2 chars for search
  const safeRows = Array.isArray(rows) ? rows : [];
  const filteredRows = safeRows.filter(row => {
    if (paymentFilter === 'database_only' && (row.status !== 'not_found' || row.profiles?.signup_source === 'gift')) return false;
    if (paymentFilter === 'succeeded' && ((row.payment_count || 0) === 0 || row.has_failed)) return false;
    if (paymentFilter === 'no_payment' && !(row.status === 'matched' && (row.lifetime_value || 0) === 0)) return false;
    if (paymentFilter === 'paid_database_only' && !(row.status === 'not_found' && (row.profiles?.membership_level === 'contributing' || row.profiles?.membership_level === 'founding') && row.profiles?.signup_source !== 'gift')) return false;
    if (paymentFilter === 'paid_db_only' && !(row.profiles?.membership_level === 'contributing' || row.profiles?.membership_level === 'founding')) return false;
    if (paymentFilter === 'gift_card' && row.profiles?.signup_source !== 'gift') return false;
    if (debouncedSearch && debouncedSearch.length >= 2) {
      const q = debouncedSearch.toLowerCase();
      const profileName = (row.profiles && typeof row.profiles === 'object' && row.profiles.full_name)
        ? String(row.profiles.full_name).toLowerCase()
        : "";
      if (
        !(row.email || "").toLowerCase().includes(q) &&
        !profileName.includes(q) &&
        !String(row.id).toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

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
            <button
              onClick={handleExportEmailCsv}
              disabled={exportCsvLoading}
              className="text-sm bg-nfw-lilac text-white px-3 py-1 rounded hover:bg-nfw-lilac/90 disabled:opacity-50"
            >
              {exportCsvLoading ? "Exporting (~30 sec)..." : "Export Email CSV"}
            </button>
            <button
              onClick={handleVerifyPayments}
              disabled={verifyPaymentsLoading}
              className="text-sm bg-nfw-citrine text-nfw-blackberry px-3 py-1 rounded hover:bg-nfw-citrine/90 disabled:opacity-50"
            >
              {verifyPaymentsLoading ? "Verifying..." : "Verify Payments"}
            </button>
            <button
              onClick={handleDeleteCache}
              className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
            >
              Delete Cache
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
                    <th className="text-center px-4 py-3 font-ui text-sm font-bold text-nfw-aubergine">True $</th>
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
                      <span className="text-nfw-aubergine font-bold">${reconciliation.summary.stripe_live.contributing.total.toLocaleString('en-US')}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-wisteria font-bold">${reconciliation.summary.stripe_live.contributing.true_total?.toLocaleString('en-US') ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-aubergine font-bold">{ourDb ? ourDb.contributing.count : '—'}</span>
                      <span className="text-nfw-blackberry/50"> / </span>
                      <span className="text-nfw-aubergine font-bold">${ourDb ? ourDb.contributing.total.toLocaleString('en-US') : '—'}</span>
                    </td>
                    <td className={`px-4 py-3 text-center font-ui text-sm font-bold ${
                      !difference ? "text-nfw-blackberry/30" :
                      difference.contributing.total === 0 ? "text-green-600" :
                      difference.contributing.total > 0 ? "text-red-600" : "text-orange-600"
                    }`}>
                      {difference ? (
                        <>
                          {difference.contributing.count > 0 ? "+" : ""}
                          {difference.contributing.count} /&nbsp;
                          {difference.contributing.total > 0 ? "+$" : difference.contributing.total < 0 ? "-$" : ""}
                          {Math.abs(difference.contributing.total).toLocaleString('en-US')}
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                  <tr className="hover:bg-nfw-dove/30">
                    <td className="px-4 py-3 font-ui text-sm font-semibold">Founding ($100)</td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-aubergine font-bold">{reconciliation.summary.stripe_live.founding.count}</span>
                      <span className="text-nfw-blackberry/50"> / </span>
                      <span className="text-nfw-aubergine font-bold">${reconciliation.summary.stripe_live.founding.total.toLocaleString('en-US')}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-wisteria font-bold">${reconciliation.summary.stripe_live.founding.true_total?.toLocaleString('en-US') ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-aubergine font-bold">{ourDb ? ourDb.founding.count : '—'}</span>
                      <span className="text-nfw-blackberry/50"> / </span>
                      <span className="text-nfw-aubergine font-bold">${ourDb ? ourDb.founding.total.toLocaleString('en-US') : '—'}</span>
                    </td>
                    <td className={`px-4 py-3 text-center font-ui text-sm font-bold ${
                      !difference ? "text-nfw-blackberry/30" :
                      difference.founding.total === 0 ? "text-green-600" :
                      difference.founding.total > 0 ? "text-red-600" : "text-orange-600"
                    }`}>
                      {difference ? (
                        <>
                          {difference.founding.count > 0 ? "+" : ""}
                          {difference.founding.count} /&nbsp;
                          {difference.founding.total > 0 ? "+$" : difference.founding.total < 0 ? "-$" : ""}
                          {Math.abs(difference.founding.total).toLocaleString('en-US')}
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                  <tr className="bg-nfw-aubergine/5 hover:bg-nfw-aubergine/10">
                    <td className="px-4 py-3 font-ui text-sm font-bold">Total</td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-aubergine font-bold">{reconciliation.summary.stripe_live.total.count}</span>
                      <span className="text-nfw-blackberry/50"> / </span>
                      <span className="text-nfw-aubergine font-bold">${reconciliation.summary.stripe_live.total.total.toLocaleString('en-US')}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-wisteria font-bold">${reconciliation.summary.stripe_live.total.true_total?.toLocaleString('en-US') ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-ui text-sm">
                      <span className="text-nfw-aubergine font-bold">{ourDb ? ourDb.total.count : '—'}</span>
                      <span className="text-nfw-blackberry/50"> / </span>
                      <span className="text-nfw-aubergine font-bold">${ourDb ? ourDb.total.total.toLocaleString('en-US') : '—'}</span>
                    </td>
                    <td className={`px-4 py-3 text-center font-ui text-sm font-bold ${
                      !difference ? "text-nfw-blackberry/30" :
                      difference.total.total === 0 ? "text-green-600" :
                      difference.total.total > 0 ? "text-red-600" : "text-orange-600"
                    }`}>
                      {difference ? (
                        <>
                          {difference.total.count > 0 ? "+" : ""}
                          {difference.total.count} /&nbsp;
                          {difference.total.total > 0 ? "+$" : difference.total.total < 0 ? "-$" : ""}
                          {Math.abs(difference.total.total).toLocaleString('en-US')}
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Verified counts */}
            <div className="flex gap-4 text-xs text-nfw-blackberry/60">
              {reconciliation.verified.valid > 0 || reconciliation.verified.refunded > 0 || reconciliation.verified.failed > 0 || reconciliation.verified.not_found > 0 ? (
                <>
                  <span>✓ Valid: {reconciliation.verified.valid}</span>
                  <span className="text-red-600">✗ Refunded: {reconciliation.verified.refunded}</span>
                  <span className="text-red-600">✗ Failed: {reconciliation.verified.failed}</span>
                  <span className="text-yellow-600">? Database Only: {reconciliation.verified.not_found}</span>
                </>
              ) : (
                <span className="text-nfw-wisteria">Click "Verify Payments" to verify each payment against Stripe.</span>
              )}
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

      {/* Missing from DB - Emails in Stripe but no profile */}
      {reconciliation && reconciliation.missing_from_db && reconciliation.missing_from_db.length > 0 && (
        <div className="bg-white rounded-lg border border-nfw-aubergine/20 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-nfw-dove">
            <h3 className="font-ui font-bold text-nfw-aubergine">
              In Stripe, No Profile ({reconciliation.missing_from_db.length})
            </h3>
            <p className="text-sm text-nfw-blackberry/60 font-ui">
              These emails are in Stripe but have no profile in our database
            </p>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            <ul className="space-y-1">
              {reconciliation.missing_from_db.map((email: string) => (
                <li key={email} className="font-mono text-sm text-nfw-blackberry/80">
                  {email}
                </li>
              ))}
            </ul>
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
              {stripeOnlyLoading ? "Starting job..." : (stripeOnlyGeneratedAt ? "Regenerate" : "Generate Stripe Data")}
            </button>
            {stripeOnlyGeneratedAt && !stripeOnlyLoading && (
              <button
                onClick={downloadStripeOnlyCSV}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Download CSV ({stripeOnly.length} charges)
              </button>
            )}
            <button
              onClick={() => window.open("/api/admin/backfill/stripe/all-transactions/export", "_blank")}
              className="text-sm bg-nfw-aubergine text-white px-3 py-1 rounded hover:bg-nfw-aubergine/90"
            >
              Download All Stripe Transactions CSV
            </button>
          </div>
        </div>
        {stripeOnlyGeneratedAt && (
          <div className="px-4 py-2 bg-green-50 border-b border-green-200 text-xs text-green-700">
            CSV generated at {new Date(stripeOnlyGeneratedAt).toLocaleTimeString()}. Download link is valid until you generate a new CSV.
          </div>
        )}
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

      {/* Missing from DB (Stripe subscriptions not in membership_payments) */}
      {missingPayments && missingPayments.summary.total_count > 0 && (
        <div className="bg-white rounded-lg border border-orange-200 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-nfw-dove bg-orange-50">
            <div>
              <h3 className="font-ui font-bold text-orange-700">
                Missing from DB ({missingPayments.summary.total_count})
              </h3>
              <p className="text-xs text-orange-600 mt-1">
                Active Stripe subscriptions NOT in our membership_payments table
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchMissingPayments}
                disabled={missingPaymentsLoading}
                className="text-sm bg-nfw-wisteria text-white px-3 py-1 rounded hover:bg-nfw-wisteria/90 disabled:opacity-50"
              >
                {missingPaymentsLoading ? "Loading..." : "Refresh"}
              </button>
              <button
                onClick={handleSyncAll}
                disabled={syncingAll || missingPayments.summary.total_count === 0}
                className="text-sm bg-nfw-aubergine text-white px-3 py-1 rounded hover:bg-nfw-aubergine/90 disabled:opacity-50"
              >
                {syncingAll ? `Syncing... (${syncAllProgress.current}/${syncAllProgress.total})` : `Sync All (${missingPayments.summary.total_count})`}
              </button>
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Contributing ($15) */}
            {missingPayments.contributing.length > 0 && (
              <div>
                <h4 className="font-ui font-semibold text-sm text-nfw-aubergine mb-2">
                  Contributing ($15) — {missingPayments.summary.contributing_count}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-nfw-dove/30">
                      <tr>
                        <th className="text-left px-3 py-2 font-ui text-xs font-bold text-nfw-aubergine">Email</th>
                        <th className="text-left px-3 py-2 font-ui text-xs font-bold text-nfw-aubergine">Stripe ID</th>
                        <th className="text-center px-3 py-2 font-ui text-xs font-bold text-nfw-aubergine">Status</th>
                        <th className="text-center px-3 py-2 font-ui text-xs font-bold text-nfw-aubergine">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-nfw-dove">
                      {missingPayments.contributing.map((account) => (
                        <tr key={account.stripe_customer_id} className="hover:bg-nfw-dove/30">
                          <td className="px-3 py-2 font-ui text-sm">
                            <div className="flex flex-col">
                              <span>{account.email}</span>
                              {account.name && (
                                <span className="text-xs text-nfw-blackberry/50">{account.name}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-nfw-blackberry/70">
                            {account.stripe_customer_id}
                          </td>
                           <td className="px-3 py-2 text-center">
                             <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                               account.profile_id
                                 ? "bg-green-100 text-green-700"
                                 : "bg-red-100 text-red-700"
                             }`}>
                               {account.profile_id ? "Has Profile" : "No Profile"}
                             </span>
                           </td>
                           <td className="px-3 py-2 text-center">
                             <div className="flex items-center justify-center gap-1 flex-wrap">
                               <a
                                 href={`https://dashboard.stripe.com/customers/${account.stripe_customer_id}`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="px-2 py-1 text-xs bg-nfw-aubergine/10 text-nfw-aubergine rounded hover:bg-nfw-aubergine/20"
                               >
                                 Stripe
                               </a>
                               <button
                                 onClick={() => handleSyncByEmail(account)}
                                 disabled={missingPaymentsAction?.id === account.stripe_customer_id}
                                 className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                               >
                                 {missingPaymentsAction?.id === account.stripe_customer_id && missingPaymentsAction?.action === "sync-email" ? "..." : "Sync Email"}
                               </button>
                               {account.profile_id && (
                                 <>
                                   <button
                                     onClick={() => handleRematch(account)}
                                     disabled={missingPaymentsAction?.id === account.stripe_customer_id}
                                     className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50"
                                   >
                                     {missingPaymentsAction?.id === account.stripe_customer_id && missingPaymentsAction?.action === "rematch" ? "..." : "Re-Match"}
                                   </button>
                                   <button
                                     onClick={() => handleSyncSingle(account)}
                                     disabled={missingPaymentsAction?.id === account.stripe_customer_id}
                                     className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                                   >
                                     {missingPaymentsAction?.id === account.stripe_customer_id && missingPaymentsAction?.action === "sync" ? "..." : "Sync"}
                                   </button>
                                 </>
                               )}
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             )}

             {/* Founding ($100) */}
            {missingPayments.founding.length > 0 && (
              <div>
                <h4 className="font-ui font-semibold text-sm text-nfw-aubergine mb-2">
                  Founding ($100) — {missingPayments.summary.founding_count}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-nfw-dove/30">
                      <tr>
                        <th className="text-left px-3 py-2 font-ui text-xs font-bold text-nfw-aubergine">Email</th>
                        <th className="text-left px-3 py-2 font-ui text-xs font-bold text-nfw-aubergine">Stripe ID</th>
                        <th className="text-center px-3 py-2 font-ui text-xs font-bold text-nfw-aubergine">Status</th>
                        <th className="text-center px-3 py-2 font-ui text-xs font-bold text-nfw-aubergine">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-nfw-dove">
                      {missingPayments.founding.map((account) => (
                        <tr key={account.stripe_customer_id} className="hover:bg-nfw-dove/30">
                          <td className="px-3 py-2 font-ui text-sm">
                            <div className="flex flex-col">
                              <span>{account.email}</span>
                              {account.name && (
                                <span className="text-xs text-nfw-blackberry/50">{account.name}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-nfw-blackberry/70">
                            {account.stripe_customer_id}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                              account.profile_id
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {account.profile_id ? "Has Profile" : "No Profile"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              <a
                                href={`https://dashboard.stripe.com/customers/${account.stripe_customer_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 text-xs bg-nfw-aubergine/10 text-nfw-aubergine rounded hover:bg-nfw-aubergine/20"
                              >
                                Stripe
                              </a>
                              <button
                                onClick={() => handleSyncByEmail(account)}
                                disabled={missingPaymentsAction?.id === account.stripe_customer_id}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                              >
                                {missingPaymentsAction?.id === account.stripe_customer_id && missingPaymentsAction?.action === "sync-email" ? "..." : "Sync Email"}
                              </button>
                              {account.profile_id && (
                                <>
                                  <button
                                    onClick={() => handleRematch(account)}
                                    disabled={missingPaymentsAction?.id === account.stripe_customer_id}
                                    className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50"
                                  >
                                    {missingPaymentsAction?.id === account.stripe_customer_id && missingPaymentsAction?.action === "rematch" ? "..." : "Re-Match"}
                                  </button>
                                  <button
                                    onClick={() => handleSyncSingle(account)}
                                    disabled={missingPaymentsAction?.id === account.stripe_customer_id}
                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                                  >
                                    {missingPaymentsAction?.id === account.stripe_customer_id && missingPaymentsAction?.action === "sync" ? "..." : "Sync"}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {missingPayments && missingPayments.summary.total_count === 0 && (
        <div className="bg-white rounded-lg border border-green-200 p-6 text-center">
          <p className="font-ui text-green-700 font-semibold">✓ All Stripe subscriptions are in membership_payments</p>
        </div>
      )}

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
                  Starting job...
                </>
              ) : (
                "Refresh Stripe"
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-nfw-wisteria/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-nfw-aubergine">${liveStats.contributing.revenue.toLocaleString('en-US')}</div>
              <div className="text-sm text-nfw-blackberry/60">Contributing ($15/mo)</div>
              <div className="text-xs text-nfw-blackberry/40 mt-1">{liveStats.contributing.count} active</div>
            </div>
            <div className="bg-nfw-citrine/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-nfw-aubergine">${liveStats.founding.revenue.toLocaleString('en-US')}</div>
              <div className="text-sm text-nfw-blackberry/60">Founding ($100)</div>
              <div className="text-xs text-nfw-blackberry/40 mt-1">{liveStats.founding.count} active</div>
            </div>
            <div className="bg-nfw-aubergine/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-nfw-aubergine">${liveStats.total.revenue.toLocaleString('en-US')}</div>
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

      {/* Duplicates in Stripe Section */}
      {stripeDuplicates.length > 0 && (
        <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
          <div className="p-4 border-b border-nfw-dove bg-amber-50">
            <h3 className="font-ui font-bold text-amber-700">Duplicates in Stripe ({stripeDuplicates.length})</h3>
            <p className="text-xs text-amber-600 mt-1">
              Same email with multiple Stripe subscriptions. Click to expand.
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {stripeDuplicates.map((dup) => (
                <div key={dup.email} className="border border-amber-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedStripeDuplicate(expandedStripeDuplicate === dup.email ? null : dup.email)}
                    className="w-full flex items-center justify-between p-3 bg-amber-50/50 hover:bg-amber-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">{dup.email}</span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                        {dup.count} subs
                      </span>
                    </div>
                    <span className="text-xs text-nfw-blackberry/50">
                      {expandedStripeDuplicate === dup.email ? "▲" : "▼"}
                    </span>
                  </button>
                  {expandedStripeDuplicate === dup.email && (
                    <div className="p-3 bg-white border-t border-amber-200">
                      <table className="w-full text-xs">
                        <thead className="bg-amber-50">
                          <tr>
                            <th className="text-left p-2">Subscription ID</th>
                            <th className="text-left p-2">Customer ID</th>
                            <th className="text-left p-2">Tier</th>
                            <th className="text-left p-2">Amount</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Period Start</th>
                            <th className="text-left p-2">Period End</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {dup.subscriptions.map((sub) => (
                            <tr key={sub.subscription_id}>
                              <td className="p-2 font-mono text-xs break-all">{sub.subscription_id}</td>
                              <td className="p-2 font-mono text-xs break-all">{sub.customer_id}</td>
                              <td className="p-2">{sub.tier}</td>
                              <td className="p-2">${sub.amount.toFixed(2)}</td>
                              <td className="p-2">{sub.status}</td>
                              <td className="p-2">{sub.current_period_start ? new Date(sub.current_period_start * 1000).toLocaleDateString() : "—"}</td>
                              <td className="p-2">{sub.current_period_end ? new Date(sub.current_period_end * 1000).toLocaleDateString() : "—"}</td>
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

      {/* Results Table */}
      {initialized && rows.length > 0 && (
        <div className="bg-white rounded-lg border border-nfw-aubergine/20 overflow-hidden">
          {/* Payment Filter Buttons */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-nfw-dove bg-nfw-dove/20 flex-wrap">
            <span className="text-xs text-nfw-blackberry/60 font-ui mr-1">Filter:</span>
            {(['all', 'database_only', 'paid_database_only', 'paid_db_only', 'succeeded', 'no_payment', 'gift_card'] as const).map((f) => {
              const labelMap = {
                all: "All",
                database_only: "Database Only",
                paid_database_only: "Paid Database Only",
                paid_db_only: "Paid (DB)",
                succeeded: "Succeeded",
                no_payment: "No Payment",
                gift_card: "Gift Card"
              };
              const countMap = {
                all: rows.length,
                database_only: rows.filter(r => r.status === 'not_found' && r.profiles?.signup_source !== 'gift').length,
                paid_database_only: rows.filter(r => r.status === 'not_found' && (r.profiles?.membership_level === 'contributing' || r.profiles?.membership_level === 'founding') && r.profiles?.signup_source !== 'gift').length,
                paid_db_only: rows.filter(r => r.profiles?.membership_level === 'contributing' || r.profiles?.membership_level === 'founding').length,
                succeeded: rows.filter(r => (r.payment_count || 0) > 0 && !r.has_failed).length,
                no_payment: rows.filter(r => r.status === 'matched' && (r.lifetime_value || 0) === 0).length,
                gift_card: rows.filter(r => r.profiles?.signup_source === 'gift').length
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
            <div className="ml-auto flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Search email, name, or ID..."
                className="border border-nfw-aubergine/20 rounded px-2 py-1.5 text-xs font-ui w-48"
              />
              <button
                onClick={handleExportFilteredCSV}
                className="px-3 py-1.5 text-xs font-semibold bg-nfw-aubergine/10 text-nfw-aubergine hover:bg-nfw-aubergine/20"
              >
                Download CSV
              </button>
            </div>
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
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-nfw-blackberry/60">
                      {debouncedSearch.length >= 2
                        ? `No results for "${debouncedSearch}"`
                        : "No matching records"}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <React.Fragment key={row.id}>
                    <tr className={`hover:bg-nfw-dove/50 ${row.has_failed && row.total_amount === 0 ? "border-l-4 border-red-500" : ""}`}>
                      <td className="px-4 py-3 font-ui text-sm">{row.email}</td>
                      <td className="px-4 py-3 font-ui text-sm">
                        {(row.profiles && typeof row.profiles === 'object' && row.profiles.full_name) || "—"}
                      </td>
                      <td className="px-4 py-3 font-ui text-sm">
                        {(() => {
                          const category = getCategory(row.profiles as Record<string, unknown>);
                          const badgeStyles: Record<string, string> = {
                            Admin: "bg-nfw-aubergine/20 text-nfw-aubergine",
                            Founding: "bg-nfw-citrine text-nfw-blackberry",
                            Contributing: "bg-green-100 text-green-700",
                            Abandoned: "bg-nfw-stone/40 text-nfw-stone",
                            "Profile Incomplete": "bg-nfw-stone/40 text-nfw-stone",
                            Free: "bg-nfw-wisteria/20 text-nfw-wisteria",
                            Waitlist: "bg-nfw-stone/40 text-nfw-stone",
                            Unknown: "bg-nfw-stone/20 text-nfw-stone/70",
                          };
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${badgeStyles[category] || badgeStyles.Unknown}`}>
                              {category}
                            </span>
                          );
                        })()}
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
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
