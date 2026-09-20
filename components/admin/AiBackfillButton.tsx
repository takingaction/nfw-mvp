"use client";

import { useState, useEffect, useRef } from "react";
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

  // activeJob: the most recent pending|processing|completed job returned by the
  // GET (no ?jobId). Set on mount and refreshed while loading. Drives the
  // "another admin already started this" UI so we never POST a duplicate.
  const [activeJob, setActiveJob] = useState<BackfillJobStatus | null>(null);

  // The mount-time GET fetches both unevaluatedCount (badge) and activeJob
  // (in-flight detection) in a single round-trip.
  useEffect(() => {
    let cancelled = false;
    const fetchSnapshot = async () => {
      try {
        const res = await fetch(`/api/admin/grants/${cycleId}/ai-backfill`);
        if (!res.ok || cancelled) return;
        const data: BackfillJobStatus = await res.json();
        if (cancelled) return;
        setCount(data.unevaluatedCount ?? 0);
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
   * Used both by the click handler (when server returns an existing jobId
   * because one is already running) and by the auto-watch effect (when
   * the page mounts with an in-flight job).
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
        `/api/admin/grants/${cycleId}/ai-backfill?jobId=${encodeURIComponent(jobId)}`,
      );
      const status: BackfillJobStatus = await statusRes.json();

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
        setMessage(
          `✅ Backfilled ${succeeded}/${total} grants${failed ? ` (${failed} failed)` : ""}. Refreshing…`,
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

  const handleBackfill = async () => {
    setMessage(null);

    // Re-engage polling on the in-flight job instead of POSTing again.
    // The server would dedupe anyway, but this avoids the round-trip and
    // makes the UX honest: "I'm watching the running job, not starting a new one."
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
      // POST creates the job (or returns the existing in-flight jobId —
      // same behavior; we cover both paths in this handler).
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

      // Whether we just created or got deduped, poll the same way.
      await pollExistingJob(jobId);
    } catch (err: any) {
      setMessage(`❌ ${err?.message || "Backfill failed"}`);
      setLoading(false);
    }
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
    <div className="flex flex-col items-start sm:items-end gap-1">
      <button
        onClick={handleBackfill}
        disabled={loading || (count === 0 && !isInFlight)}
        className="px-3 py-1.5 bg-nfw-citrine text-nfw-blackberry font-ui text-xs font-bold hover:bg-nfw-citrine/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        title={
          isInFlight
            ? "A backfill job is already running for this cycle — viewing its progress."
            : `Run Claude on ${count} grant${count === 1 ? "" : "s"} that still need AI evaluation`
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
        <p className="text-xs text-nfw-blackberry/70 max-w-prose text-left sm:text-right">
          {message}
        </p>
      )}
    </div>
  );
}
