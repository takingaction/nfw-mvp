"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";

interface AiBackfillButtonProps {
  cycleId: string;
  initialCount: number;
}

export default function AiBackfillButton({
  cycleId,
  initialCount,
}: AiBackfillButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Refresh count on mount + every 30s while loading (so the banner auto-updates)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (busy || loading) {
      interval = setInterval(refreshCount, 30_000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, loading]);

  const refreshCount = async () => {
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/ai-backfill`);
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.unevaluatedCount ?? 0);
    } catch {
      // Ignore — keep the stale count
    }
  };

  const handleBackfill = async () => {
    setLoading(true);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/ai-backfill`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Backfill failed");
      }
      const newRemaining = data.remaining ?? 0;
      setCount(newRemaining);
      if (newRemaining === 0) {
        setMessage(
          `✅ All ${data.total} grants evaluated. Refresh the page to see updated flags.`,
        );
      } else if (data.budgetReached) {
        setMessage(
          `✅ Evaluated ${data.evaluated}/${data.total}. ${newRemaining} remaining (server time budget reached). Click again to continue.`,
        );
      } else {
        setMessage(
          `✅ Evaluated ${data.evaluated}/${data.total}. ${data.failed} failed. Refresh to see updated flags.`,
        );
      }
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setMessage(`❌ ${err.message || "Backfill failed"}`);
    } finally {
      setLoading(false);
      setBusy(false);
    }
  };

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
            Running...
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

      {message && (
        <p className="text-xs text-nfw-blackberry/70 max-w-xs text-right">
          {message}
        </p>
      )}
    </>
  );
}
