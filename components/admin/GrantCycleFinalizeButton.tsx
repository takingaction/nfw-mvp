"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";

interface GrantCycleFinalizeButtonProps {
  cycleId: string;
  isFinalized: boolean;
}

export default function GrantCycleFinalizeButton({
  cycleId,
  isFinalized,
}: GrantCycleFinalizeButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFinalize = async () => {
    setLoading(true);
    setError("");
    try {
      console.log("[MarkComplete] Calling API with is_finalized:", !isFinalized);
      const res = await fetch(`/api/admin/grants/${cycleId}/cycle/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_finalized: !isFinalized }),
      });
      const data = await res.json();
      console.log("[MarkComplete] API response:", { status: res.status, data });
      if (!res.ok) throw new Error(data.error || "Failed to update");
      window.location.reload();
    } catch (err: any) {
      console.error("[MarkComplete] Error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`px-4 py-2 font-ui text-sm font-medium transition-colors ${
          isFinalized
            ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
        }`}
      >
        {isFinalized ? "Unmark Complete" : "Mark Complete"}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-nfw-blackberry font-ui">
                  {isFinalized ? "Unmark Cycle Complete?" : "Mark Cycle Complete?"}
                </h3>
                <p className="mt-2 text-sm text-nfw-blackberry/70 font-serif">
                  {isFinalized
                    ? "This will allow approvals and payments to be made again. You can unmark later if needed."
                    : "No new approvals or payments can be made after marking as complete. You can unmark later if needed."}
                </p>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-nfw-blackberry font-ui text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                disabled={loading}
                className="px-4 py-2 bg-nfw-aubergine text-white font-ui text-sm font-medium hover:bg-nfw-aubergine/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Saving..." : isFinalized ? "Unmark Complete" : "Mark Complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
