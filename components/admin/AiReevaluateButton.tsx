"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface AiReevaluateButtonProps {
  cycleId: string;
  unevaluatedCount: number;
  totalCount: number;
}

interface JobStatus {
  jobId: string;
  status: string;
  phase?: string | null;
  processed?: number;
  total?: number;
  succeeded?: number;
  failed?: number;
  progress?: string | null;
  error?: string | null;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 120; // 4 minutes — well above worst-case 25 grants × ~2s latency

export default function AiReevaluateButton({
  cycleId,
  unevaluatedCount,
  totalCount,
}: AiReevaluateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<JobStatus | null>(null);
  const [lastResult, setLastResult] = useState<{
    total: number;
    reEvaluated: number;
    failed: number;
  } | null>(null);

  /**
   * Trigger the re-evaluate, then poll for status updates. On completion
   * (or timeout / failure) the function resolves with the final state.
   */
  const runReeval = async (forceFull = false): Promise<void> => {
    setLoading(true);
    setMessage(null);
    setJobProgress(null);

    try {
      // Step 1: trigger the job
      const triggerRes = await fetch(
        `/api/admin/grants/${cycleId}/ai-reevaluate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force_full: forceFull }),
        },
      );
      const triggerData = await triggerRes.json();
      if (!triggerRes.ok) {
        throw new Error(triggerData.error || "Failed to start AI re-evaluation");
      }

      const jobId: string = triggerData.jobId;
      if (!jobId) {
        throw new Error("Server returned no jobId");
      }

      // Step 2: poll until completion
      let polls = 0;
      const poll = async (): Promise<void> => {
        if (polls >= MAX_POLLS) {
          setMessage(
            `⏱ Job ${jobId.slice(0, 8)} is still running in the background. Reload later to see results.`,
          );
          return;
        }
        polls++;

        const statusRes = await fetch(
          `/api/admin/grants/${cycleId}/ai-reevaluate?jobId=${encodeURIComponent(jobId)}`,
        );
        const status: JobStatus = await statusRes.json();

        if (!statusRes.ok) {
          throw new Error(status.error || "Failed to fetch job status");
        }

        setJobProgress(status);

        if (status.status === "completed") {
          const total = status.total ?? 0;
          const succeeded = status.succeeded ?? 0;
          const failed = status.failed ?? 0;
          setLastResult({
            total,
            reEvaluated: succeeded,
            failed,
          });
          setMessage(
            `✅ Re-ran AI on ${succeeded}/${total} grants${failed ? ` (${failed} failed)` : ""}. Refreshing…`,
          );
          setTimeout(() => window.location.reload(), 1500);
          return;
        }

        if (status.status === "failed") {
          throw new Error(
            status.error || "Job failed (see Vercel logs for details)",
          );
        }

        // pending or processing → poll again
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        await poll();
      };

      await poll();
    } catch (err: any) {
      setMessage(`❌ ${err?.message || "Failed to re-run AI filter"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (forceFull = false) => {
    void runReeval(forceFull);
  };

  // Human-readable progress while polling
  const renderProgressLabel = (): string | null => {
    if (!jobProgress) return null;
    if (jobProgress.status === "pending") return "Queued — waiting for cron…";
    if (jobProgress.status === "processing") {
      if (
        typeof jobProgress.processed === "number" &&
        typeof jobProgress.total === "number" &&
        jobProgress.total > 0
      ) {
        return `Processing: ${jobProgress.processed}/${jobProgress.total}`;
      }
      return "Processing…";
    }
    return null;
  };

  const progressLabel = renderProgressLabel();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => handleClick(false)}
          disabled={loading}
          className="px-3 py-1.5 bg-nfw-citrine text-nfw-blackberry font-ui text-xs font-bold hover:bg-nfw-citrine/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          title={
            unevaluatedCount > 0
              ? `Re-run AI on ${unevaluatedCount} not-yet-relevant grants`
              : "Re-run AI on non-relevant grants"
          }
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              {progressLabel ?? "Running..."}
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              Re-run AI Filter
            </>
          )}
        </button>
        <button
          onClick={() => handleClick(true)}
          disabled={loading || totalCount === 0}
          className="px-3 py-1.5 bg-nfw-stone/20 text-nfw-blackberry font-ui text-xs font-medium hover:bg-nfw-stone/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Force re-evaluation of ALL submitted grants (uses more API credits)"
        >
          Force Full Re-run
        </button>
      </div>
      {loading && progressLabel && (
        <p className="text-xs text-nfw-blackberry/60 font-ui">{progressLabel}</p>
      )}
      {!loading && message && (
        <p className="text-xs text-nfw-blackberry/70 max-w-xs text-right">
          {message}
        </p>
      )}
      {!loading && !message && lastResult && (
        <p className="text-xs text-nfw-blackberry/50">
          Last: {lastResult.reEvaluated}/{lastResult.total} re-evaluated
        </p>
      )}
    </div>
  );
}
