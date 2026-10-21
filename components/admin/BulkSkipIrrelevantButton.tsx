"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, XCircle } from "lucide-react";

interface BulkSkipIrrelevantButtonProps {
  cycleId: string;
  /** Change this value to re-fetch the count (e.g. after any AI action). */
  refreshKey?: unknown;
  onDone?: (updated: number) => void;
  disabled?: boolean;
}

/**
 * "Mark all irrelevant as Not Approved (N)" for Review 1. Applies the normal
 * reviewer skip to every application the AI marked irrelevant that nobody has
 * already marked valid or skipped. Uncertain applications are left alone.
 * Members aren't notified until Finalize Approvals.
 */
export default function BulkSkipIrrelevantButton({
  cycleId,
  refreshKey,
  onDone,
  disabled = false,
}: BulkSkipIrrelevantButtonProps) {
  const [count, setCount] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/ai-skip-irrelevant`);
      const data = await res.json().catch(() => ({}));
      setCount(res.ok ? data.count ?? 0 : null);
    } catch {
      setCount(null);
    }
  }, [cycleId]);

  useEffect(() => {
    loadCount();
  }, [loadCount, refreshKey]);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/ai-skip-irrelevant`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update applications");
      setShowModal(false);
      await loadCount();
      onDone?.(data.updated ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update applications");
    } finally {
      setRunning(false);
    }
  };

  const n = count ?? 0;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={disabled || n === 0}
        title={n === 0 ? "No unresolved irrelevant applications" : undefined}
        className="px-4 py-2 bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
      >
        <XCircle className="w-4 h-4" />
        Mark all irrelevant as Not Approved ({count === null ? "…" : n})
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-nfw-blackberry mb-2">
              Mark {n} application{n === 1 ? "" : "s"} as Not Approved?
            </h3>
            <p className="text-sm text-nfw-blackberry/70 mb-3">
              Every application the AI marked <strong>irrelevant</strong> (it failed at least one
              criterion) that hasn&apos;t been marked valid will be marked Not Approved.
            </p>
            <ul className="text-sm text-nfw-blackberry/70 mb-6 space-y-1 list-disc list-inside">
              <li>&ldquo;Uncertain&rdquo; applications are not affected.</li>
              <li>Members aren&apos;t notified until Finalize Approvals.</li>
              <li>You can still restore any single application afterwards.</li>
            </ul>
            {error && <p className="text-sm text-red-700 mb-4">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={running}
                className="px-4 py-2 text-sm font-bold text-nfw-blackberry/60 hover:text-nfw-blackberry disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={run}
                disabled={running}
                className="px-4 py-2 bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  `Mark ${n} Not Approved`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
