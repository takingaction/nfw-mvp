"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Check, AlertCircle } from "lucide-react";
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
    console.log("[FirstReviewPage] handleSaveScore called for grantId:", grantId, scoreData);
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/scores/first`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId, ...scoreData }),
      });

      console.log("[FirstReviewPage] API response status:", res.status);

      if (!res.ok) {
        const data = await res.json();
        console.error("[FirstReviewPage] API error:", data);
        throw new Error(data.error || "Failed to save score");
      }

      const result = await res.json();
      console.log("[FirstReviewPage] API success:", result);
    } catch (err: any) {
      console.error("Error saving score:", err);
    }
  };

  const handleCompleteReview = async () => {
    if (!confirm("Are you sure you want to mark your review as complete? You cannot edit scores after completing.")) {
      return;
    }

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

      setCompleteSuccess(true);
      setTimeout(() => {
        router.push(`/admin/grants/${cycleId}`);
      }, 2000);
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
            Review Complete!
          </h2>
          <p className="text-nfw-blackberry/60">
            Michelle has been notified to begin her review.
          </p>
          <p className="text-sm text-nfw-blackberry/40 mt-2">
            Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nfw-dove">
      {/* Header */}
      <div className="bg-white border-b border-nfw-blackberry/10 sticky top-0 z-50">
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
                onClick={handleCompleteReview}
                disabled={completing || completedCount < totalCount}
                className="px-4 py-2 bg-nfw-aubergine text-white font-bold text-sm hover:bg-nfw-aubergine/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {completing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Mark Review Complete
                  </>
                )}
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
                const isComplete = score?.is_complete;
                const subtotal = (score?.urgency_score ?? 0) +
                  (score?.authenticity_score ?? 0) +
                  (score?.impact_score ?? 0);

                return (
                  <button
                    key={grant.id}
                    onClick={() => setSelectedGrant(grant.id)}
                    className={`w-full text-left p-4 rounded transition-all ${
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
                        <div>
                          <p
                            className={`font-bold text-sm ${
                              selectedGrant === grant.id
                                ? "text-white"
                                : "text-nfw-blackberry"
                            }`}
                          >
                            {grant.profiles?.full_name || "Unknown"}
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
                      </div>
                      <div className="text-right">
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
                  </button>
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
    </div>
  );
}
