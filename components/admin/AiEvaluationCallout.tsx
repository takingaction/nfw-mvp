"use client";

import { useState } from "react";
import { Sparkles, XCircle, AlertTriangle } from "lucide-react";

export interface AiEvaluation {
  ai_relevance?: "relevant" | "irrelevant" | "uncertain" | "not_evaluated" | null;
  ai_reasoning?: string | null;
  ai_invalidated_at?: string | null;
}

interface AiEvaluationCalloutProps {
  evaluation: AiEvaluation;
  cycleId: string;
  grantId: string;
  onSkipped?: () => void;
  onRestored?: () => void;
  /** Hide the skip/restore buttons (used on combined scores page) */
  readOnly?: boolean;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AiEvaluationCallout({
  evaluation,
  cycleId,
  grantId,
  onSkipped,
  onRestored,
  readOnly = false,
}: AiEvaluationCalloutProps) {
  const { ai_relevance, ai_reasoning, ai_invalidated_at } = evaluation;

  const isFlagged =
    ai_relevance === "irrelevant" || ai_relevance === "uncertain";
  const isInvalidated = !!ai_invalidated_at;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isFlagged) return null;

  const handleSkip = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/ai-skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId, action: "skip" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to skip");
      }
      onSkipped?.();
    } catch (err: any) {
      setError(err?.message || "Failed to skip");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/ai-skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId, action: "restore" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to restore");
      }
      onRestored?.();
    } catch (err: any) {
      setError(err?.message || "Failed to restore");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-nfw-citrine/15 border-l-4 border-nfw-citrine p-3 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-nfw-aubergine flex-shrink-0" />
        <strong className="text-xs font-ui uppercase tracking-wider text-nfw-blackberry">
          AI Assessment:{" "}
          {ai_relevance === "irrelevant" ? "Likely Irrelevant" : "Cannot Determine"}
        </strong>
      </div>
      {ai_reasoning && (
        <p className="text-sm font-serif text-nfw-blackberry/80 mb-2">
          {ai_reasoning}
        </p>
      )}
      {!isInvalidated && (
        <p className="text-xs font-ui text-nfw-blackberry/50 mb-3">
          AI suggestions are advisory. You decide.
        </p>
      )}

      {isInvalidated ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-100 border border-red-300">
          <XCircle className="w-4 h-4 text-red-700 flex-shrink-0" />
          <span className="text-xs font-ui text-red-700 font-bold">
            Marked invalid on {formatDate(ai_invalidated_at)}
          </span>
          {!readOnly && (
            <button
              onClick={handleRestore}
              disabled={submitting}
              className="ml-auto text-xs font-ui text-nfw-aubergine hover:underline disabled:opacity-50"
            >
              {submitting ? "Restoring..." : "Restore as Valid"}
            </button>
          )}
        </div>
      ) : (
        !readOnly && (
          <button
            onClick={handleSkip}
            disabled={submitting}
            className="w-full px-3 py-2 bg-red-600 text-white text-xs font-ui font-bold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>Skipping...</>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3" />
                Skip &amp; Mark Invalid
              </>
            )}
          </button>
        )
      )}

      {error && (
        <p className="text-xs text-red-700 mt-2 font-ui">{error}</p>
      )}
    </div>
  );
}
