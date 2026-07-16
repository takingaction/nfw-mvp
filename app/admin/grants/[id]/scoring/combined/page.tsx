"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, Check } from "lucide-react";
import GrantCombinedScores from "@/components/admin/GrantCombinedScores";

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

  const handleFinalize = async () => {
    if (!confirm("Are you sure you want to finalize approvals? This will:\n\n1. Send 'Grant: Approved' emails to selected applicants\n2. Send 'Grant: Not Approved' emails to all other applicants\n3. Update all application statuses\n\nThis action cannot be undone.")) {
      return;
    }

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
      alert(`Finalized! ${data.approved_count} approved, ${data.rejected_count} not approved.`);
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
    const res = await fetch(`/api/admin/grants/${grantId}/transfer`, {
      method: "POST",
    });

    const data = await res.json();

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
          onFinalize={handleFinalize}
          onCheckStripeStatus={handleCheckStripeStatus}
          onSendMoney={handleSendMoney}
          loading={loading}
          finalizing={finalizing}
          alreadyFinalized={finalized}
        />
      </div>
    </div>
  );
}
