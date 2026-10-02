"use client";

import { useState } from "react";
import { Sparkles, XCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

export interface AiEvaluation {
  ai_relevance?: "relevant" | "irrelevant" | "uncertain" | "not_evaluated" | null;
  ai_reasoning?: string | null;
  ai_invalidated_at?: string | null;
  ai_validated_at?: string | null;
}

type Action = "skip" | "restore" | "validate" | "unvalidate";

interface AiEvaluationCalloutProps {
  evaluation: AiEvaluation;
  cycleId: string;
  grantId: string;
  onSkipped?: () => void;
  onRestored?: () => void;
  /** Called after Mark as Valid / Undo valid */
  onValidated?: () => void;
  /** Hide the action buttons (used on combined scores page) */
  readOnly?: boolean;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
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
  onValidated,
  readOnly = false,
}: AiEvaluationCalloutProps) {
  const { ai_relevance, ai_reasoning, ai_invalidated_at, ai_validated_at } =
    evaluation;

  const isFlagged =
    ai_relevance === "irrelevant" || ai_relevance === "uncertain";
  const isInvalidated = !!ai_invalidated_at;
  const isValidated = !isInvalidated && !!ai_validated_at;

  const [submitting, setSubmitting] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isFlagged) return null;

  const runAction = async (action: Action) => {
    setSubmitting(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/ai-skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Action failed");
      }
      if (action === "skip") onSkipped?.();
      else if (action === "restore") onRestored?.();
      else onValidated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setSubmitting(null);
    }
  };

  const verdictLabel =
    ai_relevance === "irrelevant" ? "Likely Irrelevant" : "Cannot Determine";

  // Validated: compact green state, AI reasoning kept but muted
  if (isValidated) {
    return (
      <div className="bg-green-50 border-l-4 border-green-500 p-3 mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-700 flex-shrink-0" />
          <span className="text-xs font-ui font-bold text-green-800">
            Marked valid on {formatDate(ai_validated_at)}
          </span>
          {!readOnly && (
            <button
              onClick={() => runAction("unvalidate")}
              disabled={!!submitting}
              className="ml-auto text-xs font-ui text-nfw-aubergine hover:underline disabled:opacity-50"
            >
              {submitting === "unvalidate" ? "Undoing..." : "Undo"}
            </button>
          )}
        </div>
        {ai_reasoning && (
          <p className="text-xs font-serif text-nfw-blackberry/50 mt-2">
            AI originally said ({verdictLabel}): {ai_reasoning}
          </p>
        )}
        {error && <p className="text-xs text-red-700 mt-2 font-ui">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-nfw-citrine/15 border-l-4 border-nfw-citrine p-3 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-nfw-aubergine flex-shrink-0" />
        <strong className="text-xs font-ui uppercase tracking-wider text-nfw-blackberry">
          AI Assessment: {verdictLabel}
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
              onClick={() => runAction("restore")}
              disabled={!!submitting}
              className="ml-auto text-xs font-ui text-nfw-aubergine hover:underline disabled:opacity-50"
            >
              {submitting === "restore" ? "Restoring..." : "Restore"}
            </button>
          )}
        </div>
      ) : (
        !readOnly && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => runAction("validate")}
              disabled={!!submitting}
              className="flex-1 px-3 py-2 bg-green-600 text-white text-xs font-ui font-bold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {submitting === "validate" ? (
                <>Saving...</>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Mark as Valid
                </>
              )}
            </button>
            <button
              onClick={() => runAction("skip")}
              disabled={!!submitting}
              className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-ui font-bold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {submitting === "skip" ? (
                <>Skipping...</>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Skip &amp; Mark Invalid
                </>
              )}
            </button>
          </div>
        )
      )}

      {error && <p className="text-xs text-red-700 mt-2 font-ui">{error}</p>}
    </div>
  );
}
