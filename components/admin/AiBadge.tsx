"use client";

import { Sparkles } from "lucide-react";

export interface AiBadgeProps {
  ai_relevance?: "relevant" | "irrelevant" | "uncertain" | "not_evaluated" | null;
  ai_invalidated_at?: string | null;
  /** Compact mode for narrow list columns */
  compact?: boolean;
  /** Override label (e.g., "✓ Aligned") */
  showRelevant?: boolean;
}

export default function AiBadge({
  ai_relevance,
  ai_invalidated_at,
  compact = false,
  showRelevant = false,
}: AiBadgeProps) {
  if (!ai_relevance || ai_relevance === "not_evaluated") return null;

  const isInvalidated = !!ai_invalidated_at;

  if (ai_relevance === "relevant" && !showRelevant) return null;

  if (ai_relevance === "relevant" && showRelevant) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-700 border border-green-200 ${
          compact ? "text-[10px]" : ""
        }`}
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
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 border border-red-200 ${
          compact ? "text-[10px]" : ""
        }`}
        title="Skipped by reviewer (AI-flagged)"
      >
        <Sparkles className="w-3 h-3" />
        Skipped
      </span>
    );
  }

  if (ai_relevance === "irrelevant") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 border border-red-200 ${
          compact ? "text-[10px]" : ""
        }`}
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
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-yellow-100 text-yellow-800 border border-yellow-200 ${
        compact ? "text-[10px]" : ""
      }`}
      title="AI: cannot determine"
    >
      <Sparkles className="w-3 h-3" />
      Uncertain
    </span>
  );
}
