"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, Check, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GrantCombinedScores from "@/components/admin/GrantCombinedScores";

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
  const [finalizeResult, setFinalizeResult] = useState<{ approved: number; rejected: number } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

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
      setFinalizeResult({ approved: data.approved_count, rejected: data.rejected_count });
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
                <h1 className="text-xl font-bold text-nfw-blackberry font-serif">
                  Combined Scores
                </h1>
                <p className="text-xs text-nfw-blackberry/50">
                  {cycle?.cycle_name} • ${cycle?.amount_per_grant?.toLocaleString()} per grant
                </p>
              </div>
            </div>
          </div>
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
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
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
            <div className="bg-green-50 rounded p-4 mb-6 space-y-2">
              <p className="text-sm text-green-700">
                <span className="font-bold">{finalizeResult.approved}</span> applications marked as Approved
              </p>
              <p className="text-sm text-green-700">
                <span className="font-bold">{finalizeResult.rejected}</span> applications marked as Not Approved
              </p>
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
