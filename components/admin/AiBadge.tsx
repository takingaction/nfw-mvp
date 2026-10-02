"use client";

import { Sparkles, CheckCircle2 } from "lucide-react";
import { formatESTDisplay } from "@/lib/dates";

export interface AiBadgeProps {
  ai_relevance?: "relevant" | "irrelevant" | "uncertain" | "not_evaluated" | null;
  ai_invalidated_at?: string | null;
  ai_validated_at?: string | null;
  /** Compact mode for narrow list columns */
  compact?: boolean;
  /** Override label (e.g., "✓ Aligned") */
  showRelevant?: boolean;
}

export default function AiBadge({
  ai_relevance,
  ai_invalidated_at,
  ai_validated_at,
  compact = false,
  showRelevant = false,
}: AiBadgeProps) {
  if (!ai_relevance || ai_relevance === "not_evaluated") return null;

  const isInvalidated = !!ai_invalidated_at;
  const sizeClass = compact ? "text-[10px]" : "";

  if (ai_relevance === "relevant" && !showRelevant) return null;

  if (ai_relevance === "relevant" && showRelevant) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-700 border border-green-200 ${sizeClass}`}
        title="AI: relevant"
      >
        <Sparkles className="w-3 h-3" />
        Aligned
      </span>
    );
  }

  if (isInvalidated) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 border border-red-200 ${sizeClass}`}
        title="Skipped by reviewer (AI-flagged)"
      >
        <Sparkles className="w-3 h-3" />
        Skipped
      </span>
    );
  }

  if (ai_validated_at) {
    const verdict = ai_relevance === "irrelevant" ? "Irrelevant" : "Uncertain";
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-700 border border-green-200 ${sizeClass}`}
        title={`AI flagged this as ${verdict}. A reviewer marked it valid on ${formatESTDisplay(new Date(ai_validated_at))}.`}
      >
        <CheckCircle2 className="w-3 h-3" />
        Valid
      </span>
    );
  }

  if (ai_relevance === "irrelevant") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 border border-red-200 ${sizeClass}`}
        title="AI: likely irrelevant"
      >
        <Sparkles className="w-3 h-3" />
        Irrelevant
      </span>
    );
  }

  // uncertain
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-yellow-100 text-yellow-800 border border-yellow-200 ${sizeClass}`}
      title="AI: cannot determine"
    >
      <Sparkles className="w-3 h-3" />
      Uncertain
    </span>
  );
}
