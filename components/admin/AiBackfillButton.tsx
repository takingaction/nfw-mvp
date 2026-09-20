"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";

interface AiBackfillButtonProps {
  cycleId: string;
  initialCount: number;
}

interface BackfillJobStatus {
  jobId: string | null;
  status: string;
  phase?: string | null;
  processed?: number;
  total?: number;
  succeeded?: number;
  failed?: number;
  progress?: string | null;
  error?: string | null;
  unevaluatedCount?: number;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 120; // 4 minutes — well above worst-case backfill

export default function AiBackfillButton({
  cycleId,
  initialCount,
}: AiBackfillButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<BackfillJobStatus | null>(
    null,
  );

  // Refresh count on mount. The badge always reflects the true count from
  // the database, so the admin can see at a glance how many grants are left.
  // Lightweight (single COUNT query) — no need to throttle.
  useEffect(() => {
    let cancelled = false;
    const refreshCount = async () => {
      try {
        const res = await fetch(`/api/admin/grants/${cycleId}/ai-backfill`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setCount(data.unevaluatedCount ?? 0);
      } catch {
        // Keep the stale count silently
      }
    };
    void refreshCount();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

  // While a job is in flight, refresh the count every 15 s so the badge
  // tracks the worker making progress.
  useEffect(() => {
    if (!loading) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/admin/grants/${cycleId}/ai-backfill`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setCount(data.unevaluatedCount ?? 0);
      } catch {
        // ignore
      }
    };
    const id = setInterval(tick, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [loading, cycleId]);

  const handleBackfill = async () => {
    setLoading(true);
    setMessage(null);
    setJobProgress(null);

    try {
      // Step 1: trigger the job
      const triggerRes = await fetch(
        `/api/admin/grants/${cycleId}/ai-backfill`,
        { method: "POST" },
      );
      const triggerData = await triggerRes.json();
      if (!triggerRes.ok) {
        throw new Error(triggerData.error || "Backfill failed to start");
      }

      const jobId: string | null = triggerData.jobId ?? null;
      if (!jobId) {
        throw new Error("Server returned no jobId");
      }

      // Step 2: poll for status
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
          `/api/admin/grants/${cycleId}/ai-backfill?jobId=${encodeURIComponent(jobId)}`,
        );
        const status: BackfillJobStatus = await statusRes.json();

        if (!statusRes.ok) {
          throw new Error(status.error || "Failed to fetch job status");
        }

        setJobProgress(status);

        if (status.status === "completed") {
          const total = status.total ?? 0;
          const succeeded = status.succeeded ?? 0;
          const failed = status.failed ?? 0;
          setMessage(
            `✅ Backfilled ${succeeded}/${total} grants${failed ? ` (${failed} failed)` : ""}. Refreshing…`,
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
      setMessage(`❌ ${err?.message || "Backfill failed"}`);
    } finally {
      setLoading(false);
    }
  };

  const renderProgressLabel = (): string | null => {
    if (!loading || !jobProgress) return null;
    if (jobProgress.status === "pending")
      return "Queued — waiting for cron…";
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
    <>
      <button
        onClick={handleBackfill}
        disabled={loading || count === 0}
        className="px-3 py-1.5 bg-nfw-citrine text-nfw-blackberry font-ui text-xs font-bold hover:bg-nfw-citrine/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        title={`Run Claude on ${count} grant${count === 1 ? "" : "s"} that still need AI evaluation`}
      >
        {loading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            {progressLabel ?? "Running..."}
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3" />
            Continue AI Backfill
            {count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-nfw-blackberry/10 text-nfw-blackberry text-[10px] font-bold rounded">
                {count}
              </span>
            )}
            <ArrowRight className="w-3 h-3" />
          </>
        )}
      </button>

      {loading && progressLabel && (
        <p className="text-xs text-nfw-blackberry/60 font-ui text-right">
          {progressLabel}
        </p>
      )}
      {!loading && message && (
        <p className="text-xs text-nfw-blackberry/70 max-w-xs text-right">
          {message}
        </p>
      )}
    </>
  );
}
