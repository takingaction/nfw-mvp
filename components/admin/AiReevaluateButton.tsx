"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface AiReevaluateButtonProps {
  cycleId: string;
  unevaluatedCount: number;
  totalCount: number;
}

interface JobStatus {
  jobId: string | null;
  status: string;
  forceFull?: boolean;
  phase?: string | null;
  processed?: number;
  total?: number;
  succeeded?: number;
  failed?: number;
  progress?: string | null;
  error?: string | null;
  isExpired?: boolean;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 120; // 4 minutes — well above worst-case reeval

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

  // Mount-time snapshot: surface any in-flight job (cron or another admin's
  // click) so the button can disable and show progress. Replaces the old
  // "trust the badge alone" behavior that let users double-click into
  // confusing duplicate-job states.
  const [activeJob, setActiveJob] = useState<JobStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchSnapshot = async () => {
      try {
        const res = await fetch(`/api/admin/grants/${cycleId}/ai-reevaluate`);
        if (!res.ok || cancelled) return;
        const data: JobStatus = await res.json();
        if (cancelled) return;
        if (
          data.jobId &&
          (data.status === "pending" || data.status === "processing")
        ) {
          setActiveJob(data);
        }
      } catch {
        // Keep stale state silently
      }
    };
    void fetchSnapshot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

  /**
   * Poll the existing in-flight job's status endpoint until completion.
   * Shared between the click handler (when server returns an existing jobId
   * because one is already running) and the auto-watch effect (when the
   * page mounts with an in-flight job).
   */
  const pollsRef = useRef(0);
  const pollExistingJob = async (jobId: string): Promise<void> => {
    pollsRef.current = 0;
    setLoading(true);

    const poll = async (): Promise<void> => {
      if (pollsRef.current >= MAX_POLLS) {
        setMessage(
          `⏱ Job ${jobId.slice(0, 8)} is still running in the background. Reload later to see results.`,
        );
        setLoading(false);
        return;
      }
      pollsRef.current++;

      const statusRes = await fetch(
        `/api/admin/grants/${cycleId}/ai-reevaluate?jobId=${encodeURIComponent(jobId)}`,
      );
      const status: JobStatus = await statusRes.json();

      if (!statusRes.ok) {
        setMessage(`❌ ${status.error || "Failed to fetch job status"}`);
        setLoading(false);
        return;
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
        setActiveJob(null);
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      if (status.status === "failed") {
        setMessage(
          `❌ ${status.error || "Job failed (see Vercel logs for details)"}`,
        );
        setActiveJob(null);
        setLoading(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      await poll();
    };

    await poll();
  };

  // Mount-time watch: if activeJob is set, watch it automatically so the
  // admin sees progress without having clicked anything.
  useEffect(() => {
    if (!activeJob?.jobId) return;
    if (activeJob.status !== "pending" && activeJob.status !== "processing")
      return;
    void pollExistingJob(activeJob.jobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJob?.jobId, activeJob?.status]);

  const runReeval = async (forceFull = false): Promise<void> => {
    setMessage(null);

    // Re-engage polling on the in-flight job instead of POSTing again. The
    // server would dedupe anyway, but the round-trip is unnecessary and the
    // UX is more honest: "I'm watching the running job, not starting a new one."
    if (
      activeJob?.jobId &&
      (activeJob.status === "pending" || activeJob.status === "processing")
    ) {
      await pollExistingJob(activeJob.jobId);
      return;
    }

    setLoading(true);
    setJobProgress(null);

    try {
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

      await pollExistingJob(jobId);
    } catch (err: any) {
      setMessage(`❌ ${err?.message || "Failed to re-run AI filter"}`);
      setLoading(false);
    }
  };

  const handleClick = (forceFull = false) => {
    void runReeval(forceFull);
  };

  // Visual state: is the button currently observing an in-flight job (from
  // any source — cron, another admin's click, this admin's earlier click)?
  const isInFlight =
    !!activeJob?.jobId &&
    (activeJob.status === "pending" || activeJob.status === "processing");

  const renderProgressLabel = (): string | null => {
    // Prefer the live jobProgress (per-tick accuracy) when polling.
    const source = jobProgress ?? activeJob;
    if (!source) return null;
    if (source.status === "pending") return "Queued — waiting for cron…";
    if (source.status === "processing") {
      if (
        typeof source.processed === "number" &&
        typeof source.total === "number" &&
        source.total > 0
      ) {
        return `Processing: ${source.processed}/${source.total}`;
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
          disabled={loading || isInFlight}
          className="px-3 py-1.5 bg-nfw-citrine text-nfw-blackberry font-ui text-xs font-bold hover:bg-nfw-citrine/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          title={
            isInFlight
              ? "A re-eval job is already running for this cycle — viewing its progress."
              : unevaluatedCount > 0
                ? `Re-run AI on ${unevaluatedCount} not-yet-relevant grants`
                : "Re-run AI on non-relevant grants"
          }
        >
          {loading || isInFlight ? (
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
          disabled={loading || isInFlight || totalCount === 0}
          className="px-3 py-1.5 bg-nfw-stone/20 text-nfw-blackberry font-ui text-xs font-medium hover:bg-nfw-stone/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={
            isInFlight
              ? "A re-eval job is already running — try again when it completes."
              : "Force re-evaluation of ALL submitted grants (uses more API credits)"
          }
        >
          Force Full Re-run
        </button>
      </div>
      {(loading || isInFlight) && progressLabel && (
        <p className="text-xs text-nfw-blackberry/60 font-ui">{progressLabel}</p>
      )}
      {!loading && !isInFlight && message && (
        <p className="text-xs text-nfw-blackberry/70 max-w-xs text-right">
          {message}
        </p>
      )}
      {!loading && !isInFlight && !message && lastResult && (
        <p className="text-xs text-nfw-blackberry/50">
          Last: {lastResult.reEvaluated}/{lastResult.total} re-evaluated
        </p>
      )}
    </div>
  );
}
