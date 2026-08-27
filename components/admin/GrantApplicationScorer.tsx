"use client";

import { useState, useEffect } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import GrantScoreInput from "./GrantScoreInput";

interface GrantApplicationScorerProps {
  grant: any;
  reviewerType: "first" | "second";
  onSave: (grantId: string, data: ScoreData) => void;
  saving?: boolean;
  hidePersonalInfo?: boolean;
  documents?: any[];
}

export interface ScoreData {
  urgency_score: number | null;
  authenticity_score: number | null;
  impact_score: number | null;
  barriers_yn: boolean | null;
  needs_discussion?: boolean;
  discussion_notes?: string;
  is_complete?: boolean;
}

const decodeHtml = (html: string): string => {
  if (typeof document === "undefined") return html || "";
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
};

export default function GrantApplicationScorer({
  grant,
  reviewerType,
  onSave,
  saving = false,
  hidePersonalInfo = false,
  documents,
}: GrantApplicationScorerProps) {
  const existingScore = grant.grant_scores?.[0];

  const [urgency_score, setUrgency_score] = useState<number | null>(
    existingScore?.urgency_score ?? null
  );
  const [authenticity_score, setAuthenticity_score] = useState<number | null>(
    existingScore?.authenticity_score ?? null
  );
  const [impact_score, setImpact_score] = useState<number | null>(
    existingScore?.impact_score ?? null
  );
  const [barriers_yn, setBarriers_yn] = useState<boolean | null>(
    existingScore?.barriers_yn ?? null
  );
  const [needs_discussion, setNeeds_discussion] = useState<boolean>(
    existingScore?.needs_discussion ?? false
  );
  const [discussion_notes, setDiscussion_notes] = useState<string>(
    existingScore?.discussion_notes ?? ""
  );

  const [localSaving, setLocalSaving] = useState(false);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const handleViewDocument = async (doc: any) => {
    setLoadingDocId(doc.id);
    try {
      const res = await fetch("/api/grants/document-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: doc.document_url, grantId: grant.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get URL");
      window.open(data.url, "_blank");
    } catch (err: any) {
      alert(err.message || "Failed to open document");
    } finally {
      setLoadingDocId(null);
    }
  };

  // Auto-save when values change
  useEffect(() => {
    const timer = setTimeout(() => {
      const totalScore =
        (urgency_score ?? 0) +
        (authenticity_score ?? 0) +
        (impact_score ?? 0);

      if (
        urgency_score !== null ||
        authenticity_score !== null ||
        impact_score !== null
      ) {
        // Determine if application is complete:
        // - All 3 scores filled
        // - barriers_yn filled
        // - If needs_discussion is true, discussion_notes must be filled
        const isComplete =
          urgency_score !== null &&
          authenticity_score !== null &&
          impact_score !== null &&
          barriers_yn !== null &&
          (!needs_discussion || (needs_discussion && discussion_notes.trim().length > 0));

        handleSave({
          urgency_score,
          authenticity_score,
          impact_score,
          barriers_yn,
          needs_discussion,
          discussion_notes,
          is_complete: isComplete,
        });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [urgency_score, authenticity_score, impact_score, barriers_yn, needs_discussion, discussion_notes]);

  const handleSave = async (data: ScoreData) => {
    console.log("[GrantApplicationScorer] handleSave called for grant", grant.id, data);
    setLocalSaving(true);
    try {
      await onSave(grant.id, data);
      console.log("[GrantApplicationScorer] save completed successfully");
    } catch (err) {
      console.error("[GrantApplicationScorer] save failed:", err);
    }
    setLocalSaving(false);
  };

  const totalScore = (urgency_score ?? 0) + (authenticity_score ?? 0) + (impact_score ?? 0);

  return (
    <div className="bg-white border-2 border-nfw-blackberry/10 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {!hidePersonalInfo ? (
            <>
              <div className="w-10 h-10 bg-nfw-lilac/30 flex items-center justify-center text-sm font-black text-nfw-blackberry flex-shrink-0">
                {(grant.profiles?.full_name || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-nfw-blackberry">
                  {grant.profiles?.full_name || "Unknown"}
                </p>
                {grant.profiles?.email && (
                  <p className="text-xs text-nfw-blackberry/50">
                    {grant.profiles.email}
                  </p>
                )}
                {grant.profiles?.city && (
                  <p className="text-xs text-nfw-blackberry/50">
                    {grant.profiles.city}, {grant.profiles.state}
                  </p>
                )}
                {grant.is_nominating && (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-nfw-lilac/20 text-nfw-blackberry font-medium rounded">
                    Nomination: {grant.nominee_name}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-nfw-blackberry/50">
              <div className="w-8 h-8 bg-nfw-lilac/20 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">?</span>
              </div>
              <span className="text-sm italic">Personal info hidden</span>
            </div>
          )}
        </div>
        <div className="text-right">
          {localSaving || saving ? (
            <div className="flex items-center gap-1 text-xs text-nfw-blackberry/50">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </div>
          ) : totalScore > 0 ? (
            <div className="text-xs text-nfw-blackberry/50">
              Auto-saved
            </div>
          ) : null}
        </div>
      </div>

      {/* First Reviewer's Flag Notes (shown to second reviewer only) */}
      {reviewerType === "second" && grant.first_score?.needs_discussion === true && grant.first_score?.discussion_notes && (
        <div className="bg-yellow-50 border border-yellow-200 p-3">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-1">
                Flagged by Reviewer 1
              </p>
              <p className="text-sm text-yellow-700">
                {grant.first_score.discussion_notes}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Application Content */}
      <div className="bg-nfw-dove p-3 space-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-wider mb-1">
            {grant.is_nominating ? "About the nominee" : "Who are you?"}
          </p>
          <p className="text-nfw-blackberry leading-relaxed">
            {decodeHtml(grant.who_are_you)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-wider mb-1">
            Biggest Challenge
          </p>
          <p className="text-nfw-blackberry leading-relaxed">
            {decodeHtml(grant.biggest_challenge)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-wider mb-1">
            Fund Usage
          </p>
          <p className="text-nfw-blackberry leading-relaxed">
            {decodeHtml(grant.fund_usage)}
          </p>
        </div>
      </div>

      {/* Supporting Documents */}
      {documents && documents.length > 0 && (
        <div className="bg-nfw-dove p-3 space-y-2">
          <p className="text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-wider">
            Supporting Documents ({documents.length})
          </p>
          <div className="space-y-2">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-white p-3"
              >
                <div>
                  <p className="text-sm font-medium text-nfw-blackberry">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-nfw-blackberry/40">
                    {(doc.file_size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => handleViewDocument(doc)}
                  disabled={loadingDocId === doc.id}
                  className="text-xs font-semibold text-nfw-aubergine hover:text-nfw-aubergine/70 disabled:opacity-50"
                >
                  {loadingDocId === doc.id ? "Loading..." : "View →"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scoring */}
      <div className="space-y-4 pt-2">
        <GrantScoreInput
          label="Criteria 1: Intent & Feasibility"
          value={urgency_score}
          onChange={setUrgency_score}
          description="Does the applicant present a clear, realistic plan for how the grant funds will be spent and executed?"
        />

        <GrantScoreInput
          label="Criteria 2: Authenticity of Need"
          value={authenticity_score}
          onChange={setAuthenticity_score}
          description="Does the applicant provide a clear, personal narrative of their need? Do they include a 'who', 'what', and 'why' in the context of their individual current circumstances?"
        />

        <GrantScoreInput
          label="Criteria 3: Impact"
          value={impact_score}
          onChange={setImpact_score}
          description="Does the applicant detail how this grant will meaningfully benefit their life?"
        />

        {/* BARRIERS */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-nfw-blackberry/60 uppercase tracking-wider">
            BARRIERS (Y/N)
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBarriers_yn(true)}
              className={`flex-1 py-2 text-sm font-bold rounded transition-all ${
                barriers_yn === true
                  ? "bg-nfw-aubergine text-white"
                  : "bg-nfw-dove text-nfw-blackberry hover:bg-nfw-aubergine/20"
              }`}
            >
              YES
            </button>
            <button
              type="button"
              onClick={() => setBarriers_yn(false)}
              className={`flex-1 py-2 text-sm font-bold rounded transition-all ${
                barriers_yn === false
                  ? "bg-nfw-blackberry text-white"
                  : "bg-nfw-dove text-nfw-blackberry hover:bg-nfw-blackberry/10"
              }`}
            >
              NO
            </button>
          </div>
        </div>

        {/* NEEDS DISCUSSION (Both reviewers can flag) */}
        {(reviewerType === "first" || reviewerType === "second") && (
          <div className="border-t border-nfw-blackberry/10 pt-4 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`discussion-${grant.id}`}
                checked={needs_discussion}
                onChange={(e) => setNeeds_discussion(e.target.checked)}
                className="w-4 h-4 accent-yellow-500"
              />
              <label
                htmlFor={`discussion-${grant.id}`}
                className="text-xs font-semibold text-nfw-blackberry/60 uppercase tracking-wider"
              >
                ⚠️ NEEDS ADDITIONAL DISCUSSION ({reviewerType === "first" ? "Reviewer 1" : "Reviewer 2"})
              </label>
            </div>
            {needs_discussion && (
              <textarea
                value={discussion_notes}
                onChange={(e) => setDiscussion_notes(e.target.value)}
                placeholder="Explain why this application needs discussion..."
                rows={3}
                className="w-full px-3 py-2 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/30 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac text-sm resize-none"
              />
            )}
          </div>
        )}

        {/* TOTAL SCORE */}
        <div className="bg-nfw-aubergine/10 p-3 rounded flex items-center justify-between">
          <span className="text-xs font-semibold text-nfw-blackberry/60 uppercase tracking-wider">
            Subtotal Score
          </span>
          <span className="text-2xl font-black text-nfw-aubergine">
            {totalScore}
            <span className="text-sm text-nfw-blackberry/50">/9</span>
          </span>
        </div>

        {/* RESET BUTTON */}
        <button
          onClick={async () => {
            if (!confirm("Reset all scoring data for this application?")) return;
            setUrgency_score(null);
            setAuthenticity_score(null);
            setImpact_score(null);
            setBarriers_yn(null);
            setNeeds_discussion(false);
            setDiscussion_notes("");
            // Also reset via API
            await onSave(grant.id, {
              urgency_score: null,
              authenticity_score: null,
              impact_score: null,
              barriers_yn: null,
              needs_discussion: false,
              discussion_notes: "",
              is_complete: false,
            });
          }}
          className="w-full py-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
        >
          Reset Scoring
        </button>
      </div>
    </div>
  );
}
