"use client";

import { useState } from "react";
import { Trash2, Loader2, ShieldAlert, X } from "lucide-react";

interface AiResetButtonProps {
  cycleId: string;
  totalCount: number;
}

export default function AiResetButton({ cycleId, totalCount }: AiResetButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleReset = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/ai-reset`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset AI evaluations");
      }
      setMessage(
        `✅ Reset AI evaluations for ${data.totalReset} grant${data.totalReset === 1 ? "" : "s"}. Refresh the page to see updated state.`,
      );
      setConfirmOpen(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setMessage(`❌ ${err.message || "Failed"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={() => {
          setMessage(null);
          setConfirmOpen(true);
        }}
        disabled={totalCount === 0}
        className="px-3 py-1.5 bg-nfw-stone/20 text-nfw-blackberry font-ui text-xs font-medium hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        title="Clear all AI evaluation results for this cycle (preserves reviewer skip decisions)"
      >
        <Trash2 className="w-3 h-3" />
        Reset AI Evaluations
      </button>

      {message && (
        <p className="text-xs text-nfw-blackberry/70 max-w-prose text-left">
          {message}
        </p>
      )}

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative bg-white max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-nfw-blackberry">
                Reset AI Evaluations?
              </h3>
            </div>

            <p className="text-sm text-nfw-blackberry/70 mb-3">
              This will clear the AI relevance, reasoning, evaluation timestamp,
              and model version for{" "}
              <strong>
                {totalCount} grant{totalCount === 1 ? "" : "s"}
              </strong>{" "}
              in this cycle.
            </p>

            <div className="bg-nfw-dove p-3 mb-4 text-xs text-nfw-blackberry/70 space-y-1">
              <p>
                <strong>Preserved:</strong> Reviewer skip decisions
                (<code>ai_invalidated_at</code>), grant status, and human
                scores.
              </p>
              <p>
                <strong>After reset:</strong> Apps show no AI badge until you
                click &ldquo;Re-run AI Filter&rdquo;.
              </p>
            </div>

            <p className="text-xs text-red-600 font-semibold mb-6">
              This action cannot be undone (you can re-run AI to repopulate).
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
                className="px-4 py-2 text-nfw-blackberry/60 font-bold text-sm hover:text-nfw-blackberry disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={loading || totalCount === 0}
                className="px-4 py-2 bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Reset AI Evaluations
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
              className="absolute top-3 right-3 p-1 text-nfw-blackberry/40 hover:text-nfw-blackberry disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
