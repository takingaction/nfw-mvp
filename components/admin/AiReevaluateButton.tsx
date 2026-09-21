"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface AiReevaluateButtonProps {
  cycleId: string;
  unevaluatedCount: number;
  totalCount: number;
  /**
   * Optional callback fired on every status fetch (mount snapshot, poll
   * tick). Parent (AiEvaluationPanel) owns the displayed count + "live"
   * indicator so there's only one number on the page.
   */
  onSnapshot?: (snapshot: {
    inFlight: boolean;
    unevaluatedCount: number;
    submittedCount: number;
  }) => void;
}

interface JobStatus {
  jobId: string | null;
  status: string;
  forceFull?: boolean;
  error?: string | null;
  // Live counts from the server (added 2026-09 banner removal):
  unevaluatedCount?: number;
  submittedCount?: number;
}

// Slowed from 2s → 10s. An admin who watches the page shouldn't get
// hammered, but a long-running cron job (hundreds of grants × ~1-3s each)
// can take an hour, so polling has to survive long enough to outlast it
// and continue tracking the live count while the page stays open.
const POLL_INTERVAL_MS = 10_000;

export default function AiReevaluateButton({
  cycleId,
  unevaluatedCount,
  totalCount,
  onSnapshot,
}: AiReevaluateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [activeJob, setActiveJob] = useState<JobStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Track the polling task so we can cancel it on unmount (page nav away)
  // or when a new job is queued. Without this the previous polling chain
  // keeps fetching in the background and racing state updates.
  const pollAbortRef = useRef<AbortController | null>(null);

  const pushSnapshot = (job: JobStatus | null) => {
    if (!onSnapshot) return;
    onSnapshot({
      inFlight: !!job?.jobId && (job.status === "pending" || job.status === "processing"),
      unevaluatedCount:
        job?.unevaluatedCount ?? unevaluatedCount,
      submittedCount:
        job?.submittedCount ?? totalCount,
    });
  };

  const stopPolling = () => {
    if (pollAbortRef.current) {
      pollAbortRef.current.abort();
      pollAbortRef.current = null;
    }
  };

  /**
   * Mirror GET behaviour into a polling loop with a single owner. The
   * server returns either a job (with live counts) or just counts. We
   * surface whichever the server gave us via onSnapshot.
   */
  const pollStatus = async (abort: AbortController): Promise<void> => {
    while (!abort.signal.aborted) {
      try {
        const res = await fetch(
          `/api/admin/grants/${cycleId}/ai-reevaluate`,
          { signal: abort.signal },
        );
        if (abort.signal.aborted) return;

        if (!res.ok) {
          // Don't surface HTTP errors — the admin's session may have
          // expired or the cycle may have been removed. Keep trying
          // silently; their own button clicks will surface real errors.
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        const data: JobStatus = await res.json();
        if (abort.signal.aborted) return;

        const wasInFlight =
          !!activeJob?.jobId &&
          (activeJob.status === "pending" || activeJob.status === "processing");

        const isInFlight =
          !!data.jobId && (data.status === "pending" || data.status === "processing");

        setActiveJob(data);
        pushSnapshot(data);

        // Job finished while we were watching → refresh page so other
        // parts of the UI (reviewer panels, totals) catch up.
        if (
          wasInFlight &&
          data.jobId === activeJob?.jobId &&
          !isInFlight
        ) {
          if (data.status === "completed") {
            setMessage(
              `✅ Re-run completed. Updating page…`,
            );
            setTimeout(() => window.location.reload(), 800);
            return;
          }
          if (data.status === "failed") {
            setMessage(
              `❌ ${data.error || "Re-evaluation job failed"}`,
            );
            return;
          }
        }

        // Exit the polling loop when there's genuinely nothing left to wait
        // for. Covers three terminal states:
        //   1. no job row exists AND the live count is zero
        //   2. a completed job AND the live count is zero
        //   3. a stale/failed job AND the live count is zero (the worker
        //      couldn't do more but the global cron / a sibling worker
        //      already covered everything)
        if ((data.unevaluatedCount ?? 0) === 0) {
          return;
        }
      } catch (err) {
        // AbortError is expected on unmount; everything else is silent.
        if ((err as Error).name === "AbortError") return;
      }
      await sleep(POLL_INTERVAL_MS);
    }
  };

  // Mount → start polling, hand ownership to the ref so unmount can stop it.
  useEffect(() => {
    const abort = new AbortController();
    pollAbortRef.current = abort;
    void pollStatus(abort);
    return () => {
      abort.abort();
      if (pollAbortRef.current === abort) {
        pollAbortRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

  const runReeval = async (forceFull = false): Promise<void> => {
    setMessage(null);
    setLoading(true);
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
        throw new Error(
          triggerData.error || "Failed to start AI re-evaluation",
        );
      }
      // Existing job race-guard: server returns the id of whatever job
      // is already running. Cancel our background polling and start
      // a fresh one tied to that jobId.
      stopPolling();
      const abort = new AbortController();
      pollAbortRef.current = abort;
      void pollStatus(abort);
      setMessage("✅ Triggered — checking status…");
    } catch (err: any) {
      setMessage(`❌ ${err?.message || "Failed to re-run AI filter"}`);
    } finally {
      setLoading(false);
    }
  };

  // Treat the cycle as "done" from the user's perspective when:
  //   (a) there's no in-flight job row, OR
  //   (b) the latest server-snapshot says zero grants still need
  //       evaluation. Covers the common case where the global cron or a
  //       sibling worker has drained the backlog while a stale per-cycle
  //       job row lingers (e.g. cancelled manually).
  const noWorkLeft = (activeJob?.unevaluatedCount ?? 0) === 0;
  const isInFlight =
    !noWorkLeft &&
    !!activeJob?.jobId &&
    (activeJob.status === "pending" || activeJob.status === "processing");

  const progressLabel = isInFlight
    ? activeJob?.status === "pending"
      ? "Queued — waiting for cron…"
      : "Evaluating…"
    : null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => void runReeval(false)}
          disabled={loading || isInFlight}
          className="px-3 py-1.5 bg-nfw-citrine text-nfw-blackberry font-ui text-xs font-bold hover:bg-nfw-citrine/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          title={
            isInFlight
              ? "A re-eval job is already running for this cycle."
              : unevaluatedCount > 0
              ? `Re-run AI on ${unevaluatedCount} not-yet-relevant grants`
              : "Re-run AI on non-relevant grants"
          }
        >
          {(loading || isInFlight) && (
            <Loader2 className="w-3 h-3 animate-spin" />
          )}
          {progressLabel ?? (
            <>
              <Sparkles className="w-3 h-3" />
              Re-run AI Filter
            </>
          )}
        </button>
        <button
          onClick={() => void runReeval(true)}
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
      {!loading && !isInFlight && message && (
        <p className="text-xs text-nfw-blackberry/70 max-w-xs text-right">
          {message}
        </p>
      )}
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
