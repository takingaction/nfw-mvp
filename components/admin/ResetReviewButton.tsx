"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";

interface Counts {
  applications: number;
  aiEvaluated: number;
  skipped: number;
  markedValid: number;
  reviewCompleteFlags: number;
  scores: number;
  tentativeApprovals: number;
  draws: number;
  queuedAiEvaluations: number;
  notSubmittedStatus: number;
}

const ROWS: Array<[keyof Counts, string]> = [
  ["aiEvaluated", "AI verdicts"],
  ["skipped", "Not-approved (skip) marks"],
  ["markedValid", "Marked-valid overrides"],
  ["scores", "Reviewer scores"],
  ["reviewCompleteFlags", "Review-complete flags"],
  ["draws", "Draw results"],
  ["tentativeApprovals", "Tentative approvals"],
  ["queuedAiEvaluations", "Queued AI evaluations"],
];

/**
 * Admin-only: clear all human and AI review activity for a non-finalized cycle
 * (see /api/admin/grants/[id]/reset-review). Shows a dry run first and
 * requires typing RESET.
 */
export default function ResetReviewButton({ cycleId }: { cycleId: string }) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = async () => {
    setOpen(true);
    setTyped("");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/reset-review`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCounts(data.wouldClear);
      setBlocked(data.blocked);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/reset-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: cycleId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Reset failed");
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
      setRunning(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-300 text-red-700 font-ui text-sm font-medium hover:bg-red-50 transition-colors flex-shrink-0"
      >
        <RotateCcw className="w-4 h-4" />
        Reset review
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-nfw-blackberry mb-2">Reset all review activity?</h3>
            <p className="text-sm text-nfw-blackberry/70 mb-3">
              Clears every human and AI review action for this cycle. Application statuses and anything
              members can see are not changed. The AI review re-runs automatically within a few minutes.
            </p>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-nfw-blackberry my-4" />
            ) : counts ? (
              <div className="bg-nfw-dove p-3 mb-4 text-sm">
                <p className="font-bold text-nfw-blackberry mb-1">
                  {counts.applications} applications · this will clear:
                </p>
                <ul className="space-y-0.5 text-nfw-blackberry/70">
                  {ROWS.map(([k, label]) => (
                    <li key={k} className="flex justify-between">
                      <span>{label}</span>
                      <span className="font-bold">{counts[k]}</span>
                    </li>
                  ))}
                </ul>
                {counts.notSubmittedStatus > 0 && (
                  <p className="text-xs text-yellow-800 mt-2">
                    {counts.notSubmittedStatus} application(s) aren&apos;t in &ldquo;submitted&rdquo; status. Their
                    status is left as is.
                  </p>
                )}
              </div>
            ) : null}
            {blocked && <p className="text-sm text-red-700 mb-3">{blocked} Reset is not available.</p>}
            {!blocked && counts && (
              <label className="block text-sm text-nfw-blackberry mb-4">
                Type <strong>RESET</strong> to confirm
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-nfw-blackberry/20 text-nfw-blackberry"
                  autoFocus
                />
              </label>
            )}
            {error && <p className="text-sm text-red-700 mb-3">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setOpen(false)}
                disabled={running}
                className="px-4 py-2 text-sm font-bold text-nfw-blackberry/60 hover:text-nfw-blackberry disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={run}
                disabled={running || !!blocked || !counts || typed !== "RESET"}
                className="px-4 py-2 bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {running && <Loader2 className="w-4 h-4 animate-spin" />}
                Reset review
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
