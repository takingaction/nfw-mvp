"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface AiReevaluateButtonProps {
  cycleId: string;
  unevaluatedCount: number;
  totalCount: number;
}

export default function AiReevaluateButton({
  cycleId,
  unevaluatedCount,
  totalCount,
}: AiReevaluateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    total: number;
    reEvaluated: number;
    failed: number;
  } | null>(null);

  const handleClick = async (forceFull = false) => {
    setLoading(true);
    setMessage(null);
    try {
      const url = `/api/admin/grants/${cycleId}/ai-reevaluate${
        forceFull ? "?onlyNonRelevant=false" : ""
      }`;
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to re-run AI filter");
      }
      setLastResult({
        total: data.total,
        reEvaluated: data.reEvaluated,
        failed: data.failed,
      });
      setMessage(
        `✅ Re-ran AI on ${data.reEvaluated}/${data.total} grants${
          data.failed ? ` (${data.failed} failed)` : ""
        }. Refresh the page to see updated flags.`,
      );
      // Auto-reload after a moment so the reviewer UI picks up new flags
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setMessage(`❌ ${err.message || "Failed"}`);
    } finally {
      setLoading(false);
    }
  };

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
              Running...
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
      {message && (
        <p className="text-xs text-nfw-blackberry/70 max-w-xs text-right">
          {message}
        </p>
      )}
      {lastResult && !loading && !message && (
        <p className="text-xs text-nfw-blackberry/50">
          Last: {lastResult.reEvaluated}/{lastResult.total} re-evaluated
        </p>
      )}
    </div>
  );
}
