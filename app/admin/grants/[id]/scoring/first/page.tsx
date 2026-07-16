"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Check, AlertCircle, Eye, EyeOff } from "lucide-react";
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
}

export default function FirstReviewPage() {
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
  const [isFirstComplete, setIsFirstComplete] = useState(false);
  const [visibleNames, setVisibleNames] = useState<Set<string>>(new Set());

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
      const res = await fetch(`/api/admin/grants/${cycleId}/scores/first`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400 && data.error === "Scoring has not started yet") {
          // Start scoring automatically
          await startScoring();
          return;
        }
        throw new Error(data.error || "Failed to fetch grants");
      }

      setGrants(data.grants || []);
      if (data.grants?.length > 0 && !selectedGrant) {
        setSelectedGrant(data.grants[0].id);
      }
      // Check if all grants have rachel_complete = true
      const allComplete = data.grants?.every((g: any) => g.rachel_complete === true) || false;
      setIsFirstComplete(allComplete);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startScoring = async () => {
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/scoring/start`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start scoring");
      }

      // Refetch grants
      fetchGrants();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSaveScore = async (grantId: string, scoreData: ScoreData) => {
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/scores/first`, {
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
          needs_discussion: false,
          discussion_notes: "",
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

        await fetch(`/api/admin/grants/${cycleId}/scores/first`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grantId: grant.id, ...scoreData }),
        });
      }

      // Call the complete endpoint to notify Michelle
      const res = await fetch(`/api/admin/grants/${cycleId}/scoring/complete`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete review");
      }

      // Show success state briefly then refresh to show updated button state
      setCompleteSuccess(true);
      setTimeout(() => {
        // Refresh page data to show the unlock state on main page buttons
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

  if (completeSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nfw-dove">
        <div className="bg-white border border-nfw-blackberry/10 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-nfw-blackberry mb-2">
            First Review Complete!
          </h2>
          <p className="text-nfw-blackberry/60">
            Michelle has been notified. Reloading...
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
                  First Review
                </h1>
                <p className="text-xs text-nfw-blackberry/50">
                  {completedCount} of {totalCount} applications reviewed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowCompleteModal(true)}
                disabled={completedCount < totalCount || isFirstComplete}
                className="px-4 py-2 bg-nfw-aubergine text-white font-bold text-sm hover:bg-nfw-aubergine/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <Check className="w-4 h-4" />
                {isFirstComplete ? "First Review Complete" : "Mark Review Complete"}
              </button>
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
            </div>
          </div>

          {/* Application List */}
          <div className="col-span-12 lg:col-span-4">
            <h2 className="text-sm font-bold text-nfw-blackberry/60 uppercase tracking-wider mb-3">
              Applications
            </h2>
            <div className="space-y-3">
              {grants.map((grant) => {
                const score = grant.grant_scores?.[0];
                const subtotal = (score?.urgency_score ?? 0) +
                  (score?.authenticity_score ?? 0) +
                  (score?.impact_score ?? 0);
                const isComplete = score?.is_complete === true;
                const isFlagged = score?.needs_discussion;

                return (
                  <div
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
                          {grant.profiles?.full_name?.charAt(0).toUpperCase() || "U"}
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
                        {isFlagged && (
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
                        {isComplete ? (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              selectedGrant === grant.id
                                ? "bg-white/20 text-white"
                                : "bg-green-500 text-white"
                            }`}
                          >
                            {subtotal}/9
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
                reviewerType="first"
                onSave={handleSaveScore}
                saving={saving}
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
              Ready to submit your first reviewer scores. You can continue editing after submitting if needed.
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
