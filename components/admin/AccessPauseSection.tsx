"use client";

import { useState } from "react";
import { PauseCircle, PlayCircle } from "lucide-react";
import { formatSiteDisplay } from "@/lib/dates";

export type AccessPauseFields = {
  access_paused_at: string | null;
  access_paused_reason: string | null;
  access_paused_dispute_id: string | null;
};

/**
 * Admin edit-panel section to pause / unpause a member's access.
 * Applies immediately (separate from "Save Changes"), via
 * POST /api/admin/members/[id]/access-pause.
 */
export function AccessPauseSection({
  memberId,
  isSelf,
  fields,
  onChanged,
}: {
  memberId: string;
  isSelf: boolean;
  fields: AccessPauseFields;
  onChanged: (fields: AccessPauseFields) => void;
}) {
  const [reason, setReason] = useState("");
  const [disputeId, setDisputeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const paused = !!fields.access_paused_at;

  const submit = async (action: "pause" | "unpause") => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/members/${memberId}/access-pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "pause"
            ? { action, reason: reason.trim(), disputeId: disputeId.trim() || undefined }
            : { action },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      if (action === "pause") {
        onChanged({
          access_paused_at: new Date().toISOString(),
          access_paused_reason: reason.trim(),
          access_paused_dispute_id: disputeId.trim() || null,
        });
        setReason("");
        setDisputeId("");
      } else {
        onChanged({ access_paused_at: null, access_paused_reason: null, access_paused_dispute_id: null });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-black text-nfw-blackberry mb-3">Access Pause</label>

      {paused ? (
        <div className="border-2 border-nfw-aubergine bg-nfw-aubergine/5 p-3 space-y-2">
          <p className="text-sm font-semibold text-nfw-aubergine flex items-center gap-2">
            <PauseCircle className="w-4 h-4" /> Paused since {formatSiteDisplay(new Date(fields.access_paused_at!))}
          </p>
          {fields.access_paused_reason && (
            <p className="text-xs text-nfw-blackberry/70">Reason: {fields.access_paused_reason}</p>
          )}
          {fields.access_paused_dispute_id ? (
            <p className="text-xs text-nfw-blackberry/70">
              Dispute: <span className="font-mono">{fields.access_paused_dispute_id}</span> — unpauses
              automatically if the dispute is won.
            </p>
          ) : (
            <p className="text-xs text-nfw-blackberry/50">Not linked to a dispute — unpause manually.</p>
          )}
          <button
            type="button"
            onClick={() => submit("unpause")}
            disabled={busy}
            className="mt-1 inline-flex items-center gap-2 px-3 py-2 bg-nfw-blackberry text-white text-xs font-bold hover:bg-nfw-blackberry/90 disabled:opacity-50"
          >
            <PlayCircle className="w-4 h-4" /> {busy ? "Unpausing..." : "Unpause access"}
          </button>
        </div>
      ) : isSelf ? (
        <p className="text-xs text-nfw-blackberry/40">You can&apos;t pause your own account.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-nfw-blackberry/50">
            Locks the member out of perks, the store, travel and new grant applications. Their tier and
            Stripe subscription are not changed. They&apos;ll see a notice on their dashboard.
          </p>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required), e.g. Stripe dispute filed"
            maxLength={500}
            className="w-full px-3 py-2 text-sm border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry"
          />
          <input
            type="text"
            value={disputeId}
            onChange={(e) => setDisputeId(e.target.value)}
            placeholder="Stripe dispute ID (optional), dp_..."
            className="w-full px-3 py-2 text-sm font-mono border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry"
          />
          <button
            type="button"
            onClick={() => submit("pause")}
            disabled={busy || !reason.trim()}
            className="inline-flex items-center gap-2 px-3 py-2 bg-nfw-aubergine text-white text-xs font-bold hover:bg-nfw-aubergine/90 disabled:opacity-50"
          >
            <PauseCircle className="w-4 h-4" /> {busy ? "Pausing..." : "Pause access"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
