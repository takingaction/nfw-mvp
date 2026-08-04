"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, Check, Shield, ChevronDown, ChevronUp, Mail, RefreshCw, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GrantCombinedScores from "@/components/admin/GrantCombinedScores";
import GrantCycleFinalizeButton from "@/components/admin/GrantCycleFinalizeButton";

const ALLOWED_EMAILS = [
  "rachel@nationalfundforwomen.org",
  "michelle@nationalfundforwomen.org",
  "kelsey@nationalfundforwomen.org",
  "ron@myherodesign.com",
];

interface StripeCheckResult {
  grantId: string;
  connected: boolean;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  isRestricted?: boolean;
}

interface Grant {
  id: string;
  rank: number;
  profiles?: {
    full_name: string;
    email: string;
    city: string;
    state: string;
    stripe_onboarding_completed?: boolean;
  };
  is_nominating: boolean;
  nominee_name: string;
  who_are_you: string;
  biggest_challenge: string;
  fund_usage: string;
  combined_score: number;
  decision: string;
  needs_discussion: boolean;
  discussion_notes: string | null;
  second_needs_discussion: boolean;
  second_discussion_notes: string | null;
  barriers_yn: boolean | null;
  has_received_grant: boolean;
  is_tentatively_approved: boolean;
  stripe_connect_account_id?: string | null;
  funded_at?: string | null;
  transfer_id?: string | null;
  stripe_onboarding_completed?: boolean;
  documents?: any[];
  applications_this_month?: number;
  total_available_grants?: number;
}

interface Cycle {
  id: string;
  cycle_name: string;
  amount_per_grant: number;
  grants_available: number;
  total_funds: number;
  scoring_completed_at: string;
  final_approved_at: string;
  is_finalized: boolean;
}

export default function CombinedScoresPage() {
  const params = useParams();
  const router = useRouter();
  const cycleId = params.id as string;

  const [grants, setGrants] = useState<Grant[]>([]);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<{
    approved: { sent: number; failed: number; failed_emails: string[] };
    rejected: { sent: number; failed: number; failed_emails: string[] };
  } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Retry panel state
  const [retryExpanded, setRetryExpanded] = useState(false);
  // Check failed count state
  const [hasCheckedFailed, setHasCheckedFailed] = useState(false);
  const [failedCheckCount, setFailedCheckCount] = useState(0);
  const [checkLoading, setCheckLoading] = useState(false);
  // Retry Failed state
  const [retryAllLoading, setRetryAllLoading] = useState(false);
  const [showRetryResults, setShowRetryResults] = useState(false);
  const [retryAllResults, setRetryAllResults] = useState<any[]>([]);
  // Check Resend Delivered state (for historical cycles)
  const [dateFrom, setDateFrom] = useState("2026-07-29");
  const [dateTo, setDateTo] = useState("2026-08-02");
  const [checkResendLoading, setCheckResendLoading] = useState(false);
  const [checkResendResult, setCheckResendResult] = useState<{
    checked: number;
    delivered: number;
    needsRetry: number;
    needsRetryApproved: number;
    needsRetryRejected: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
        setAccessDenied(true);
      } else {
        setUserEmail(user.email);
      }
    };
    checkAccess();
  }, []);

  useEffect(() => {
    fetchData();
  }, [cycleId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/scores/combined`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch combined scores");
      }

      setGrants(data.grants || []);
      setCycle(data.cycle);
      setTotalPaid(data.totalPaid || 0);
      if (data.cycle?.final_approved_at) {
        setFinalized(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTentativeApprove = async (grantIds: string[]) => {
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/tentative-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantIds }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save selections");
      }

      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenConfirmModal = (): Promise<void> => {
    setShowConfirmModal(true);
    return Promise.resolve();
  };

  const handleFinalize = async () => {
    setShowConfirmModal(false);
    setFinalizing(true);
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/final-approve`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to finalize approvals");
      }

      setFinalized(true);
      setFinalizeResult({
        approved: {
          sent: data.approved?.sent || 0,
          failed: data.approved?.failed || 0,
          failed_emails: data.approved?.failed_emails || [],
        },
        rejected: {
          sent: data.rejected?.sent || 0,
          failed: data.rejected?.failed || 0,
          failed_emails: data.rejected?.failed_emails || [],
        },
      });
      setShowResultModal(true);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFinalizing(false);
    }
  };

  const handleCheckStripeStatus = async (): Promise<StripeCheckResult[]> => {
    const res = await fetch(`/api/admin/grants/${cycleId}/check-connections`, {
      method: "POST",
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to check connections");
    }

    const data = await res.json();
    return data.results || [];
  };

  const handleSendMoney = async (grantId: string): Promise<{ error?: string; success?: boolean }> => {
    console.log(`[handleSendMoney] Starting transfer for grant ${grantId}`);

    const res = await fetch(`/api/admin/grants/${grantId}/transfer`, {
      method: "POST",
    });

    const data = await res.json();
    console.log(`[handleSendMoney] Response:`, { status: res.status, data });

    if (!res.ok) {
      return { error: data.error || "Failed to send money" };
    }

    // Refetch to update the grant status
    fetchData();
    return { success: true };
  };

  const handleFetchFailedEmails = async () => {
    try {
      const res = await fetch(`/api/admin/grants/failed-emails?cycle_ids=${cycleId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    } catch (err: any) {
      alert(err.message);
      return null;
    }
  };

  const handleCheckFailed = async () => {
    setCheckLoading(true);
    try {
      const result = await handleFetchFailedEmails();
      if (!result) return;
      setFailedCheckCount(result.failed_emails?.length || 0);
      setHasCheckedFailed(true);
    } finally {
      setCheckLoading(false);
    }
  };

  const handleCheckResendDelivered = async () => {
    setCheckResendLoading(true);
    setCheckResendResult(null);
    try {
      const res = await fetch("/api/admin/grants/check-resend-delivered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_from: `${dateFrom}T00:00:00Z`,
          date_to: `${dateTo}T23:59:59Z`,
          cycle_id: cycleId,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to check Resend");

      setCheckResendResult({
        checked: data.checked || 0,
        delivered: data.delivered_count || 0,
        needsRetry: data.needs_retry_count || 0,
        needsRetryApproved: data.needs_retry_approved || 0,
        needsRetryRejected: data.needs_retry_rejected || 0,
        message: data.message || "",
      });
      // Also populate failedCheckCount so Retry Failed button works
      setFailedCheckCount(data.needs_retry_count || 0);
      setHasCheckedFailed(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCheckResendLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    setRetryAllLoading(true);
    setShowRetryResults(false);
    try {
      // Call retry-failed API
      const res = await fetch(`/api/admin/grants/retry-failed?cycle_ids=${cycleId}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // Store results and show
      setRetryAllResults(data.results || []);
      setShowRetryResults(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRetryAllLoading(false);
    }
  };

  const handleCopyRetryAllFailed = () => {
    const failedEmailsList = retryAllResults
      .filter((r: any) => r.status === "failed")
      .map((r: any) => r.email);
    if (failedEmailsList.length > 0) {
      navigator.clipboard.writeText(failedEmailsList.join(", "));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nfw-dove">
        <Loader2 className="w-8 h-8 animate-spin text-nfw-blackberry" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nfw-dove">
        <div className="bg-white border border-nfw-blackberry/10 p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-nfw-blackberry mb-2">Access Denied</h2>
          <p className="text-nfw-blackberry/60 mb-6">
            You don&apos;t have permission to access this page.
          </p>
          <Link
            href="/admin/grants"
            className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-blackberry text-white text-sm font-bold hover:bg-nfw-blackberry/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Grants
          </Link>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="min-h-screen p-8 bg-nfw-dove">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 p-6 rounded">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h2 className="font-bold">Error</h2>
            </div>
            <p className="text-red-600">{error}</p>
            <Link
              href={`/admin/grants/${cycleId}`}
              className="inline-flex items-center gap-2 mt-4 text-sm text-red-700 hover:text-red-800"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Grants
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nfw-dove">
      {/* Header */}
      <div className="bg-white border-b border-nfw-blackberry/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/admin/grants/${cycleId}`}
                className="flex items-center gap-2 text-sm text-nfw-blackberry/50 hover:text-nfw-blackberry transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Grant
              </Link>
              <div>
                <h1 className="text-xl font-bold text-nfw-blackberry font-serif flex items-center gap-2">
                  Combined Scores
                  {cycle?.is_finalized && (
                    <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full font-ui">
                      COMPLETE
                    </span>
                  )}
                </h1>
                <p className="text-xs text-nfw-blackberry/50">
                  {cycle?.cycle_name} • ${cycle?.amount_per_grant?.toLocaleString()} per grant
                </p>
              </div>
            </div>
            <GrantCycleFinalizeButton
              cycleId={cycleId}
              isFinalized={cycle?.is_finalized || false}
            />
          </div>
        </div>
      </div>

      {/* Retry Failed Emails Panel */}
      <div className="bg-white border-b border-nfw-blackberry/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Panel Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setRetryExpanded(!retryExpanded)}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4 text-nfw-wisteria" />
              <span className="text-sm font-bold text-nfw-blackberry">Retry Failed Emails</span>
              {finalizeResult && (finalizeResult.approved.failed > 0 || finalizeResult.rejected.failed > 0) && (
                <span className="text-xs text-red-600">
                  ({finalizeResult.approved.failed + finalizeResult.rejected.failed} failed)
                </span>
              )}
            </button>
            <div className="flex items-center gap-2">
              {/* Date inputs for Check Resend Delivered */}
              <div className="flex items-center gap-1 text-xs">
                <label className="text-nfw-blackberry/50">From:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-1 py-1 border border-nfw-blackberry/20 rounded text-xs"
                />
                <label className="text-nfw-blackberry/50 ml-1">To:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-1 py-1 border border-nfw-blackberry/20 rounded text-xs"
                />
              </div>
              {/* Check Resend Delivered Button */}
              <button
                onClick={handleCheckResendDelivered}
                disabled={checkResendLoading}
                className="px-3 py-1.5 bg-nfw-lilac text-white text-xs font-bold rounded hover:bg-nfw-lilac/90 disabled:opacity-50 flex items-center gap-1"
                title="Check Resend for historical cycles"
              >
                {checkResendLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Mail className="w-3 h-3" />
                    Check Resend
                  </>
                )}
              </button>
              {/* Check Status Button */}
              <button
                onClick={handleCheckFailed}
                disabled={checkLoading}
                className="px-3 py-1.5 bg-nfw-wisteria text-white text-xs font-bold rounded hover:bg-nfw-wisteria/90 disabled:opacity-50 flex items-center gap-1"
              >
                {checkLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    Check Status
                  </>
                )}
              </button>
              {/* Retry Failed Button */}
              <button
                onClick={handleRetryFailed}
                disabled={retryAllLoading || !hasCheckedFailed}
                className="px-3 py-1.5 bg-nfw-aubergine text-white text-xs font-bold rounded hover:bg-nfw-aubergine/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title={!hasCheckedFailed ? "Click Check Status first to see how many emails will be retried" : undefined}
              >
                {retryAllLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    Retry Failed
                  </>
                )}
              </button>
              {retryExpanded ? (
                <ChevronUp className="w-4 h-4 text-nfw-blackberry/50 cursor-pointer" onClick={() => setRetryExpanded(false)} />
              ) : (
                <ChevronDown className="w-4 h-4 text-nfw-blackberry/50 cursor-pointer" onClick={() => setRetryExpanded(true)} />
              )}
            </div>
          </div>

          {/* Panel Content */}
          {retryExpanded && (
            <div className="mt-3 pt-3 border-t border-nfw-blackberry/10">
              {/* Last Finalization Result Summary */}
              {finalizeResult && (
                <div className="text-xs text-nfw-blackberry/60 mb-2">
                  Last finalization: {finalizeResult.approved.sent} approved sent, {finalizeResult.approved.failed} failed • {finalizeResult.rejected.sent} rejected sent, {finalizeResult.rejected.failed} failed
                </div>
              )}

              {/* Check Status Result */}
              {hasCheckedFailed && (
                <div className="flex items-center gap-3 text-xs mb-2">
                  <span className="text-nfw-blackberry/60">
                    Found <span className="font-bold text-red-600">{failedCheckCount}</span> failed email{failedCheckCount !== 1 ? "s" : ""} to retry
                  </span>
                  {failedCheckCount === 0 && (
                    <span className="text-green-600 font-bold">No emails need retrying</span>
                  )}
                </div>
              )}

              {/* Check Resend Delivered Result */}
              {checkResendResult && (
                <div className="flex flex-col gap-1 text-xs mb-2 p-3 bg-nfw-lilac/10 rounded">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-nfw-lilac" />
                    <span className="text-nfw-blackberry/60">
                      Checked <span className="font-bold">{checkResendResult.checked}</span> emails:
                      <span className="text-green-600 ml-2">{checkResendResult.delivered}</span> already delivered,
                      <span className="text-red-600 ml-2">{checkResendResult.needsRetry}</span> need retry
                    </span>
                  </div>
                  {checkResendResult.needsRetryApproved > 0 && (
                    <div className="flex items-center gap-2 pl-6">
                      <Check className="w-3 h-3 text-green-600" />
                      <span className="text-nfw-blackberry/60">
                        <span className="font-bold text-green-600">{checkResendResult.needsRetryApproved}</span> approved applicants will receive grant approval email
                      </span>
                    </div>
                  )}
                  {checkResendResult.needsRetryRejected > 0 && (
                    <div className="flex items-center gap-2 pl-6">
                      <X className="w-3 h-3 text-red-600" />
                      <span className="text-nfw-blackberry/60">
                        <span className="font-bold text-red-600">{checkResendResult.needsRetryRejected}</span> rejected applicants will receive rejection email
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Retry All Results */}
              {showRetryResults && retryAllResults.length > 0 && (
                <div className="mt-3 pt-3 border-t border-nfw-blackberry/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-nfw-blackberry">Retry All Results</span>
                    <button
                      onClick={() => setShowRetryResults(false)}
                      className="text-xs text-nfw-blackberry/50 hover:text-nfw-blackberry"
                    >
                      Collapse
                    </button>
                  </div>
                  
                  {/* Summary */}
                  <div className="flex gap-4 mb-2 text-xs">
                    <span className="text-green-600">
                      ✓ Retried: {retryAllResults.filter((r: any) => r.status === "retried").length}
                    </span>
                    <span className="text-blue-600">
                      ⊘ Skipped: {retryAllResults.filter((r: any) => r.status === "skipped").length}
                    </span>
                    <span className="text-red-600">
                      ✗ Failed: {retryAllResults.filter((r: any) => r.status === "failed").length}
                    </span>
                  </div>

                  {/* Per-email results */}
                  <div className="max-h-48 overflow-y-auto border border-nfw-blackberry/10 rounded">
                    {retryAllResults.slice(0, 50).map((result: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 border-b border-nfw-blackberry/5 last:border-b-0">
                        {result.status === "retried" && (
                          <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
                        )}
                        {result.status === "skipped" && (
                          <span className="w-3 h-3 text-blue-600 flex-shrink-0 text-center">⊘</span>
                        )}
                        {result.status === "failed" && (
                          <span className="w-3 h-3 text-red-600 flex-shrink-0 text-center">✗</span>
                        )}
                        <span className="flex-1 text-xs truncate">{result.email}</span>
                        <span className="text-xs text-nfw-blackberry/50 capitalize">
                          {result.status === "retried" && "sent"}
                          {result.status === "skipped" && (result.reason || "skipped")}
                          {result.status === "failed" && (result.error?.substring(0, 30) || "failed")}
                        </span>
                      </div>
                    ))}
                    {retryAllResults.length > 50 && (
                      <div className="px-3 py-2 text-xs text-nfw-blackberry/50 text-center bg-gray-50">
                        + {retryAllResults.length - 50} more...
                      </div>
                    )}
                  </div>

                  {/* Copy failed button */}
                  {retryAllResults.filter((r: any) => r.status === "failed").length > 0 && (
                    <button
                      onClick={handleCopyRetryAllFailed}
                      className="mt-2 px-3 py-1.5 bg-nfw-aubergine text-white text-xs font-bold rounded hover:bg-nfw-aubergine/90"
                    >
                      Copy {retryAllResults.filter((r: any) => r.status === "failed").length} Failed Emails
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <GrantCombinedScores
          grants={grants}
          cycle={cycle!}
          totalPaid={totalPaid}
          onTentativeApprove={handleTentativeApprove}
          onFinalize={handleOpenConfirmModal}
          onCheckStripeStatus={handleCheckStripeStatus}
          onSendMoney={handleSendMoney}
          loading={loading}
          finalizing={finalizing}
          alreadyFinalized={finalized}
        />
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-nfw-blackberry mb-2">
              Finalize Approvals?
            </h3>
            <p className="text-nfw-blackberry/70 mb-4">
              This will:
            </p>
            <ul className="text-sm text-nfw-blackberry/70 mb-6 space-y-1 list-disc list-inside">
              <li>Send "Grant: Approved" emails to selected applicants</li>
              <li>Send "Grant: Not Approved" emails to all other applicants</li>
              <li>Update all application statuses</li>
            </ul>
            <p className="text-sm text-nfw-blackberry/50 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={finalizing}
                className="px-4 py-2 bg-gray-100 text-nfw-blackberry font-bold text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="px-4 py-2 bg-nfw-aubergine text-white font-bold text-sm hover:bg-nfw-aubergine/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {finalizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  "Finalize"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && finalizeResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-nfw-blackberry">
                Finalization Complete
              </h3>
            </div>
            <p className="text-nfw-blackberry/70 mb-4">
              The following actions have been completed:
            </p>
            <div className="bg-green-50 rounded p-4 mb-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm text-green-700">
                  <span className="font-bold">Approved</span> emails sent
                </p>
                <p className="text-sm font-bold text-green-700">
                  {finalizeResult.approved.sent}/{finalizeResult.approved.sent + finalizeResult.approved.failed}
                </p>
              </div>
              {finalizeResult.approved.failed > 0 && (
                <div className="border-t border-green-200 pt-2 mt-2">
                  <p className="text-xs text-red-600 mb-1">{finalizeResult.approved.failed} failed:</p>
                  <textarea
                    readOnly
                    value={finalizeResult.approved.failed_emails.join(", ")}
                    className="w-full text-xs border rounded p-1 bg-white"
                    rows={2}
                  />
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-green-200">
                <p className="text-sm text-green-700">
                  <span className="font-bold">Rejected</span> emails sent
                </p>
                <p className="text-sm font-bold text-green-700">
                  {finalizeResult.rejected.sent}/{finalizeResult.rejected.sent + finalizeResult.rejected.failed}
                </p>
              </div>
              {finalizeResult.rejected.failed > 0 && (
                <div className="border-t border-green-200 pt-2 mt-2">
                  <p className="text-xs text-red-600 mb-1">{finalizeResult.rejected.failed} failed:</p>
                  <div className="flex gap-2">
                    <textarea
                      readOnly
                      value={finalizeResult.rejected.failed_emails.join(", ")}
                      className="flex-1 text-xs border rounded p-1 bg-white"
                      rows={2}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(finalizeResult.rejected.failed_emails.join(", "));
                      }}
                      className="px-2 py-1 bg-nfw-aubergine text-white text-xs rounded hover:bg-nfw-aubergine/90"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowResultModal(false); setFinalizeResult(null); }}
                className="px-4 py-2 bg-nfw-aubergine text-white font-bold text-sm hover:bg-nfw-aubergine/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
