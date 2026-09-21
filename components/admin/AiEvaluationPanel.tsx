"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import AiReevaluateButton from "@/components/admin/AiReevaluateButton";
import AiResetButton from "@/components/admin/AiResetButton";

interface AiEvaluationPanelProps {
  cycleId: string;
  initialUnevaluatedCount: number;
  initialSubmittedCount: number;
  totalCount: number;
}

interface PanelSnapshot {
  inFlight: boolean;
  unevaluatedCount: number;
  submittedCount: number;
}

/**
 * Single source of truth for "how many grants still need AI evaluation" on
 * the admin grant cycle page. Replaces the previous citrine banner +
 * AiBackfillButton + AI-strip combo, which showed two numbers that could
 * never agree (banner counted live `grants` rows, button counted a frozen
 * `ai_backfill_jobs.processed_count / total_count` snapshot).
 *
 * The numbers in this panel always agree because there's only one of them.
 * The re-evaluate button owns the polling loop and pushes new counts up
 * via onSnapshot, so a long-running cron job or the global
 * ai-evaluate-pending cron both update the same number the admin sees.
 */
export default function AiEvaluationPanel({
  cycleId,
  initialUnevaluatedCount,
  initialSubmittedCount,
  totalCount,
}: AiEvaluationPanelProps) {
  const [snapshot, setSnapshot] = useState<PanelSnapshot>({
    inFlight: false,
    unevaluatedCount: initialUnevaluatedCount,
    submittedCount: initialSubmittedCount,
  });

  return (
    <div className="bg-nfw-dove border border-nfw-blackberry/10 p-3 sm:p-4 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-ui font-bold text-nfw-blackberry/50">
          <Sparkles className="w-3.5 h-3.5" />
          AI Evaluation
        </p>
        {snapshot.unevaluatedCount > 0 && (
          <p className="text-xs font-ui text-nfw-blackberry/50">
            <span data-testid="ai-unevaluated-count">
              {snapshot.unevaluatedCount}
            </span>{" "}
            of {snapshot.submittedCount} submitted not yet evaluated
            {snapshot.inFlight ? " · live" : ""}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <AiReevaluateButton
          cycleId={cycleId}
          unevaluatedCount={snapshot.unevaluatedCount}
          totalCount={snapshot.submittedCount}
          onSnapshot={(s) => setSnapshot(s)}
        />
        <AiResetButton cycleId={cycleId} totalCount={totalCount} />
      </div>
    </div>
  );
}
