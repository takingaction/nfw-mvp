"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Check, AlertCircle, Lock, Eye, EyeOff, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GrantScoringRubric from "@/components/admin/GrantScoringRubric";
import GrantApplicationScorer, { ScoreData } from "@/components/admin/GrantApplicationScorer";

interface Grant {
  id: string;
  profiles?: {
    full_name: string;
    email: string;
    city: string;
    state: string;
  };
  who_are_you: string;
  biggest_challenge: string;
  fund_usage: string;
  is_nominating: boolean;
  nominee_name: string;
  submitted_at: string;
  grant_scores: any[];
  first_score?: {
    needs_discussion?: boolean;
    discussion_notes?: string;
    total_score?: number;
  };
  documents?: any[];
  applications_this_month?: number;
  total_available_grants?: number;
}

export default function SecondReviewPage() {
  const params = useParams();
  const router = useRouter();
  const cycleId = params.id as string;

  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeSuccess, setCompleteSuccess] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isSecondComplete, setIsSecondComplete] = useState(false);
  const [visibleNames, setVisibleNames] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "runner_up" | "not_approved" | "unscored">("all");
  const [multiAppFilter, setMultiAppFilter] = useState<"all" | "2plus">("all");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccessDenied(true);
        return;
      }
      // Check if user is admin or reviewer via profile
      const res = await fetch(`/api/auth/profile`);
      const data = await res.json();
      const isAuthorized = data.profile?.is_admin || data.profile?.is_reviewer;
      if (!isAuthorized) {
        setAccessDenied(true);
      } else {
        setUserEmail(user.email || null);
      }
    };
    checkAccess();
  }, []);

  const getCombinedStatus = (grant: Grant): "approved" | "runner_up" | "not_approved" | "unscored" => {
    const secondScore = grant.grant_scores?.[0];
    const isSecondComplete = secondScore?.is_complete === true;

    if (!isSecondComplete) return "unscored";

    const firstTotal = grant.first_score?.total_score || 0;
    const secondSubtotal = (secondScore?.urgency_score ?? 0) +
                          (secondScore?.authenticity_score ?? 0) +
                          (secondScore?.impact_score ?? 0);
    const combined = firstTotal + secondSubtotal;

    if (combined >= 14) return "approved";
    if (combined >= 8) return "runner_up";
    return "not_approved";
  };

  const combinedStatusCounts = {
    approved: grants.filter(g => getCombinedStatus(g) === "approved").length,
    runner_up: grants.filter(g => getCombinedStatus(g) === "runner_up").length,
    not_approved: grants.filter(g => getCombinedStatus(g) === "not_approved").length,
    unscored: grants.filter(g => getCombinedStatus(g) === "unscored").length,
  };

  const toggleNameVisibility = (grantId: string) => {
    const newVisible = new Set(visibleNames);
    if (newVisible.has(grantId)) {
      newVisible.delete(grantId);
    } else {
      newVisible.add(grantId);
    }
    setVisibleNames(newVisible);
  };

  useEffect(() => {
    fetchGrants();
  }, [cycleId]);

  const fetchGrants = async () => {
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/scores/second`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400) {
          setError(data.error || "First reviewer has not completed yet");
        } else {
          throw new Error(data.error || "Failed to fetch grants");
        }
        setLoading(false);
        return;
      }

      setGrants(data.grants || []);
      if (data.grants?.length > 0 && !selectedGrant) {
        setSelectedGrant(data.grants[0].id);
      }
      // Check if all grants have michelle_complete = true
      const allComplete = data.grants?.every((g: any) => g.michelle_complete === true) || false;
      setIsSecondComplete(allComplete);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScore = async (grantId: string, scoreData: ScoreData) => {
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/scores/second`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId, ...scoreData }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save score");
      }

      // Update local state with saved score
      const result = await res.json();
      setGrants((prevGrants) =>
        prevGrants.map((g) => {
          if (g.id === grantId) {
            return {
              ...g,
              grant_scores: [{
                ...g.grant_scores?.[0],
                ...scoreData,
                total_score: result.total_score,
              }],
            };
          }
          return g;
        })
      );
    } catch (err: any) {
      console.error("Error saving score:", err);
    }
  };

  const handleCompleteReview = async () => {
    setShowCompleteModal(false);

    setCompleting(true);
    try {
      // First, mark all unscored grants with 0
      const unscoredGrants = grants.filter(
        (g) => !g.grant_scores || g.grant_scores.length === 0
      );

      for (const grant of unscoredGrants) {
        await handleSaveScore(grant.id, {
          urgency_score: 0,
          authenticity_score: 0,
          impact_score: 0,
          barriers_yn: false,
        });
      }

      // Then mark each as complete
      for (const grant of grants) {
        const scoreData: ScoreData = {
          urgency_score: grant.grant_scores?.[0]?.urgency_score ?? 0,
          authenticity_score: grant.grant_scores?.[0]?.authenticity_score ?? 0,
          impact_score: grant.grant_scores?.[0]?.impact_score ?? 0,
          barriers_yn: grant.grant_scores?.[0]?.barriers_yn ?? false,
          needs_discussion: grant.grant_scores?.[0]?.needs_discussion ?? false,
          discussion_notes: grant.grant_scores?.[0]?.discussion_notes ?? "",
          is_complete: true,
        };

        await fetch(`/api/admin/grants/${cycleId}/scores/second`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grantId: grant.id, ...scoreData }),
        });
      }

      // Call the second complete endpoint to set michelle_complete = true
      const res = await fetch(`/api/admin/grants/${cycleId}/scoring/second-complete`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete review");
      }

      // Show success state briefly then reload
      setCompleteSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCompleting(false);
    }
  };

  const selectedGrantData = grants.find((g) => g.id === selectedGrant);

  const completedCount = grants.filter((g) => g.grant_scores?.[0]?.is_complete).length;
  const totalCount = grants.length;

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
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded">
            <div className="flex items-center gap-2 text-yellow-700 mb-2">
              <Lock className="w-5 h-5" />
              <h2 className="font-bold">Review Locked</h2>
            </div>
            <p className="text-yellow-700">{error}</p>
            <p className="text-sm text-yellow-600 mt-2">
              The first reviewer must complete their review before you can begin.
            </p>
            <Link
              href={`/admin/grants/${cycleId}`}
              className="inline-flex items-center gap-2 mt-4 text-sm text-yellow-700 hover:text-yellow-800"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Grants
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (completeSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nfw-dove">
        <div className="bg-white border border-nfw-blackberry/10 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-nfw-blackberry mb-2">
            Second Review Complete!
          </h2>
          <p className="text-nfw-blackberry/60">
            Combined Scores is now unlocked. Reloading...
          </p>
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
                  Second Review
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowCompleteModal(true)}
                disabled={completedCount < totalCount || isSecondComplete}
                className="px-4 py-2 bg-nfw-aubergine text-white font-bold text-sm hover:bg-nfw-aubergine/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <Check className="w-4 h-4" />
                {isSecondComplete ? "Second Review Complete" : "Mark Review Complete"}
              </button>
            </div>
          </div>
          {/* Running Tally */}
          <div className="flex items-center gap-6 text-xs">
            <span className="text-nfw-blackberry/60 font-semibold uppercase tracking-wider">Combined Status:</span>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-bold">{combinedStatusCounts.approved}</span>
              <span className="text-nfw-blackberry/60">Approved</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded font-bold">{combinedStatusCounts.runner_up}</span>
              <span className="text-nfw-blackberry/60">Runner Up</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold">{combinedStatusCounts.not_approved}</span>
              <span className="text-nfw-blackberry/60">Not Approved</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 bg-nfw-stone/30 text-nfw-blackberry/60 rounded font-bold">{combinedStatusCounts.unscored}</span>
              <span className="text-nfw-blackberry/60">Unscored</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-12 gap-6">
          {/* Rubric Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="sticky top-24">
              <GrantScoringRubric showDiscussionFlag={true} />
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> You cannot see the first reviewer&apos;s
                  scores. Score each application independently based on the rubric.
                </p>
              </div>
            </div>
          </div>

          {/* Application List */}
          <div className="col-span-12 lg:col-span-4 flex flex-col">
            <h2 className="text-sm font-bold text-nfw-blackberry/60 uppercase tracking-wider mb-3 sticky top-0 bg-nfw-dove z-10 pb-2">
              Applications
            </h2>
            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap mb-3 sticky top-10 bg-nfw-dove z-10 pb-2">
              {(["all", "approved", "runner_up", "not_approved", "unscored"] as const).map((f) => {
                const labelMap = {
                  all: "All",
                  approved: "Approved",
                  runner_up: "Runner Up",
                  not_approved: "Not Approved",
                  unscored: "Unscored",
                };
                const countMap = {
                  all: totalCount,
                  approved: combinedStatusCounts.approved,
                  runner_up: combinedStatusCounts.runner_up,
                  not_approved: combinedStatusCounts.not_approved,
                  unscored: combinedStatusCounts.unscored,
                };
                return (
                  <button
                    key={f}
                    onClick={() => { setStatusFilter(f); setMultiAppFilter("all"); }}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      statusFilter === f && multiAppFilter === "all"
                        ? "bg-nfw-blackberry text-white"
                        : "bg-nfw-stone/20 text-nfw-blackberry hover:bg-nfw-stone/30"
                    }`}
                  >
                    {labelMap[f]}
                    <span className={`text-xs ${statusFilter === f && multiAppFilter === "all" ? "opacity-70" : "opacity-50"}`}>
                      ({countMap[f]})
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => { setStatusFilter("all"); setMultiAppFilter(m => m === "2plus" ? "all" : "2plus"); }}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  multiAppFilter === "2plus"
                    ? "bg-nfw-aubergine text-white"
                    : "bg-nfw-stone/20 text-nfw-blackberry hover:bg-nfw-stone/30"
                }`}
              >
                2+ Apps
                <span className={`text-xs ${multiAppFilter === "2plus" ? "opacity-70" : "opacity-50"}`}>
                  ({grants.filter(g => (g.applications_this_month || 1) >= 2).length})
                </span>
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 180px)' }}>
              {grants.filter(g => {
                if (statusFilter !== "all" && getCombinedStatus(g) !== statusFilter) return false;
                if (multiAppFilter === "2plus" && (g.applications_this_month || 1) < 2) return false;
                return true;
              }).map((grant) => {
                const score = grant.grant_scores?.[0];
                const subtotal = (score?.urgency_score ?? 0) +
                  (score?.authenticity_score ?? 0) +
                  (score?.impact_score ?? 0);
                const isComplete = score?.is_complete === true;
                const isFirstFlagged = grant.first_score?.needs_discussion === true;
                const firstTotal = grant.first_score?.total_score || 0;
                const combinedTotal = firstTotal + subtotal;

                return (
                  <div
                    key={grant.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedGrant(grant.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedGrant(grant.id); }}
                    className={`w-full text-left p-4 rounded transition-all cursor-pointer ${
                      selectedGrant === grant.id
                        ? "bg-nfw-aubergine text-white"
                        : isComplete
                        ? "bg-green-50 border border-green-200 hover:border-green-300"
                        : "bg-white border border-nfw-blackberry/10 hover:border-nfw-blackberry/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <div
                          className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                            selectedGrant === grant.id
                              ? "bg-white/20 text-white"
                              : isComplete
                              ? "bg-green-500 text-white"
                              : "bg-nfw-dove text-nfw-blackberry"
                          }`}
                        >
                          ?
                        </div>
                        <div className="flex items-center gap-2">
                          <div>
                            <p
                              className={`font-bold text-sm ${
                                selectedGrant === grant.id
                                  ? "text-white"
                                  : "text-nfw-blackberry"
                              } ${!visibleNames.has(grant.id) ? "opacity-40" : ""}`}
                            >
                              {visibleNames.has(grant.id) ? (grant.profiles?.full_name || "Unknown") : "••••••"}
                            </p>
                            {grant.is_nominating && (
                              <span
                                className={`text-xs ${
                                  selectedGrant === grant.id
                                    ? "text-white/70"
                                    : "text-nfw-blackberry/50"
                                }`}
                              >
                                Nomination
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleNameVisibility(grant.id); }}
                            className={`p-1 rounded hover:bg-nfw-blackberry/10 ${
                              selectedGrant === grant.id ? "text-white/60 hover:text-white" : "text-nfw-blackberry/40 hover:text-nfw-blackberry"
                            }`}
                            title={visibleNames.has(grant.id) ? "Hide name" : "Show name"}
                          >
                            {visibleNames.has(grant.id) ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        {isFirstFlagged && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              selectedGrant === grant.id
                                ? "bg-yellow-400 text-yellow-900"
                                : "bg-yellow-100 text-yellow-800 border border-yellow-300"
                            }`}
                          >
                            Flagged
                          </span>
                        )}
                        {isComplete && (() => {
                           const combinedStatus = getCombinedStatus(grant);
                           const statusConfig = {
                             approved: { label: "Approved", bg: "bg-green-500", text: "text-white" },
                             runner_up: { label: "Runner Up", bg: "bg-yellow-400", text: "text-yellow-900" },
                             not_approved: { label: "Not Approved", bg: "bg-red-500", text: "text-white" },
                           };
                           const config = statusConfig[combinedStatus as keyof typeof statusConfig];
                           return (
                             <span
                               className={`text-xs px-2 py-0.5 rounded font-bold ${config.bg} ${config.text}`}
                             >
                               {config.label}
                             </span>
                           );
                         })()}
                        <span className={`text-xs px-1 ${selectedGrant === grant.id ? "text-white/60" : "text-nfw-blackberry/40"}`}>
                          {grant.applications_this_month || 1}/{grant.total_available_grants || 1}
                        </span>
                         {isComplete ? (
                           <span
                             className={`text-xs px-2 py-0.5 rounded ${
                               selectedGrant === grant.id
                                 ? "bg-white/20 text-white"
                                 : "bg-green-500 text-white"
                             }`}
                           >
                             {combinedTotal}/18
                           </span>
                         ) : (
                          <span
                            className={`text-xs ${
                              selectedGrant === grant.id
                                ? "text-white/70"
                                : "text-nfw-blackberry/40"
                            }`}
                          >
                            Not scored
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scoring Panel */}
          <div className="col-span-12 lg:col-span-5">
            {selectedGrantData ? (
              <GrantApplicationScorer
                key={selectedGrantData.id}
                grant={selectedGrantData}
                reviewerType="second"
                onSave={handleSaveScore}
                saving={saving}
                hidePersonalInfo={true}
                documents={selectedGrantData.documents}
              />
            ) : (
              <div className="bg-white border border-nfw-blackberry/10 p-8 text-center">
                <p className="text-nfw-blackberry/40">
                  Select an application to begin scoring
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete Review Confirmation Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-nfw-blackberry mb-2">
              Mark Review Complete?
            </h3>
            <p className="text-nfw-blackberry/70 mb-6">
              Ready to submit your second reviewer scores. You can continue editing after submitting if needed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 text-sm font-bold text-nfw-blackberry/60 hover:text-nfw-blackberry transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteReview}
                disabled={completing}
                className="px-4 py-2 bg-nfw-aubergine text-white text-sm font-bold hover:bg-nfw-aubergine/90 disabled:opacity-50 flex items-center gap-2"
              >
                {completing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  "Mark Complete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
