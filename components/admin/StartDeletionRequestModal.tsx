"use client";

import { useState } from "react";
import { X, UserX } from "lucide-react";

type RequestedVia = "email" | "freshdesk" | "phone" | "other";

interface StartDeletionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string | undefined;
  memberName: string | undefined;
  memberEmail: string | undefined;
}

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Records a deletion request the member made through support (email, Freshdesk,
 * phone). It does not delete anything: the request lands in
 * /admin/deletion-requests as Pending and goes through Verify → Process.
 */
export function StartDeletionRequestModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  memberEmail,
}: StartDeletionRequestModalProps) {
  const [requestedVia, setRequestedVia] = useState<RequestedVia>("email");
  const [ticketNumber, setTicketNumber] = useState("");
  const [requestedOn, setRequestedOn] = useState(todayLocal());
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingRequestId, setExistingRequestId] = useState<string | null>(null);

  if (!isOpen || !memberId) return null;

  const reset = () => {
    setRequestedVia("email");
    setTicketNumber("");
    setRequestedOn(todayLocal());
    setNotes("");
    setConfirmed(false);
    setError(null);
    setExistingRequestId(null);
    setSubmitting(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const canSubmit =
    confirmed &&
    notes.trim().length >= 10 &&
    (requestedVia !== "freshdesk" || ticketNumber.trim().length > 0) &&
    !submitting;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setExistingRequestId(null);
    try {
      // Date-only input → noon local, so the stored timestamp stays on the chosen day.
      const isToday = requestedOn === todayLocal();
      const requestedAt = isToday ? undefined : new Date(`${requestedOn}T12:00:00`).toISOString();

      const res = await fetch("/api/admin/deletion-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          requestedVia,
          ticketNumber: ticketNumber.trim() || undefined,
          notes: notes.trim(),
          requestedAt,
        }),
      });
      const result = await res.json();
      if (res.status === 409 && result.requestId) {
        setExistingRequestId(result.requestId);
        throw new Error(result.error);
      }
      if (!res.ok) throw new Error(result.error || "Failed to create deletion request");

      window.location.href = `/admin/deletion-requests?id=${encodeURIComponent(result.requestId)}`;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create deletion request");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={close} />

      <div className="relative bg-white rounded-none w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-nfw-blackberry/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-red-50 rounded-full">
              <UserX className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-black text-nfw-blackberry font-ui">Start Deletion Request</h2>
          </div>
          <button onClick={close} className="p-2 hover:bg-nfw-blackberry/5 transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-nfw-blackberry/50" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-nfw-blackberry">
            Use this when the member asked to delete their account through support. This only records
            the request. Nothing is deleted until it&apos;s verified and processed in Deletion Requests.
          </p>

          <div className="bg-nfw-dove p-4">
            <p className="font-semibold text-nfw-blackberry">{memberName || "Unknown Member"}</p>
            <p className="text-sm text-nfw-blackberry/60">{memberEmail}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-nfw-blackberry/70">How did they ask?</span>
              <select
                value={requestedVia}
                onChange={(e) => setRequestedVia(e.target.value as RequestedVia)}
                className="mt-1 w-full border border-nfw-blackberry/20 px-3 py-2 text-sm"
              >
                <option value="email">Email</option>
                <option value="freshdesk">Freshdesk ticket</option>
                <option value="phone">Phone</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-nfw-blackberry/70">Date they asked</span>
              <input
                type="date"
                value={requestedOn}
                max={todayLocal()}
                onChange={(e) => setRequestedOn(e.target.value)}
                className="mt-1 w-full border border-nfw-blackberry/20 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-nfw-blackberry/70">
              Ticket number {requestedVia === "freshdesk" ? "(required)" : "(optional)"}
            </span>
            <input
              type="text"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              className="mt-1 w-full border border-nfw-blackberry/20 px-3 py-2 text-sm"
              placeholder="e.g. 12345"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-nfw-blackberry/70">Note (required)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full border border-nfw-blackberry/20 px-3 py-2 text-sm"
              placeholder="e.g. Member emailed support asking to delete their account; self-serve delete was blocked."
            />
          </label>

          <label className="flex items-start gap-2 text-sm text-nfw-blackberry">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1"
            />
            <span>I confirm the member asked for their account to be deleted, and the request came from the email on this account.</span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
              {existingRequestId && (
                <>
                  {" "}
                  <a
                    href={`/admin/deletion-requests?id=${encodeURIComponent(existingRequestId)}`}
                    className="underline font-semibold"
                  >
                    Open it
                  </a>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-nfw-blackberry/10 flex gap-3 bg-nfw-dove">
          <button
            onClick={close}
            disabled={submitting}
            className="flex-1 py-3 border-2 border-nfw-blackberry/20 text-sm font-semibold text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="flex-1 py-3 bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
