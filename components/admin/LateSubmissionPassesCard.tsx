"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Copy, KeyRound, Lock } from "lucide-react";
import ConfirmModal from "@/components/admin/ConfirmModal";

/**
 * Late Submission Passes (migration 196).
 * Lets an admin allow one member to apply to this cycle for 12 hours after
 * it has closed, without reopening it publicly. The admin sends the link
 * to the member manually.
 */

type PassStatus = "active" | "used" | "expired" | "revoked";

interface PassPerson {
  full_name: string | null;
  email: string | null;
}

interface Pass {
  id: string;
  reason: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  status: PassStatus;
  member: PassPerson | null;
  grantedBy: PassPerson | null;
}

const SITE_URL = "https://www.nationalfundforwomen.org";

function formatET(iso: string): string {
  return (
    new Date(iso).toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) + " ET"
  );
}

const STATUS_STYLES: Record<PassStatus, string> = {
  active: "bg-green-100 text-green-800",
  used: "bg-nfw-wisteria/20 text-nfw-blackberry",
  expired: "bg-nfw-stone/40 text-nfw-blackberry/70",
  revoked: "bg-red-100 text-red-700",
};

export default function LateSubmissionPassesCard({
  cycleId,
}: {
  cycleId: string;
}) {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [locked, setLocked] = useState(false);
  const [cycleStatus, setCycleStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [issuedFor, setIssuedFor] = useState<string | null>(null);
  // Which copy button was last clicked, so only that one shows "Copied".
  const [copied, setCopied] = useState<"header" | "issued" | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Pass | null>(null);
  const [extendTarget, setExtendTarget] = useState<Pass | null>(null);
  const [notice, setNotice] = useState("");
  // Collapsed by default so the card doesn't dominate the cycle page.
  const [expanded, setExpanded] = useState(false);

  const applyLink = `${SITE_URL}/grants/apply?cycleId=${cycleId}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/exceptions`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setPasses(data.passes ?? []);
        setLocked(Boolean(data.locked));
        setCycleStatus(data.cycleStatus ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setIssuedFor(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || `Failed to issue pass (HTTP ${res.status})`);
        return;
      }
      setIssuedFor(data?.pass?.member?.full_name || email);
      setEmail("");
      setReason("");
      setCopied(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (source: "header" | "issued") => {
    try {
      await navigator.clipboard.writeText(applyLink);
      setCopied(source);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard unavailable — link is visible for manual copy */
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    const target = revokeTarget;
    setRevokeTarget(null);
    const res = await fetch(
      `/api/admin/grants/${cycleId}/exceptions/${target.id}`,
      {
        method: "DELETE",
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Failed to revoke pass");
    }
    await load();
  };

  const handleExtend = async () => {
    if (!extendTarget) return;
    const target = extendTarget;
    setExtendTarget(null);
    setError("");
    setNotice("");
    const res = await fetch(
      `/api/admin/grants/${cycleId}/exceptions/${target.id}`,
      {
        method: "PATCH",
      },
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || `Failed to extend pass (HTTP ${res.status})`);
    } else {
      setNotice(
        `Pass for ${target.member?.full_name || target.member?.email || "member"} extended until ${formatET(data.pass.expires_at)}. The apply link is unchanged.`,
      );
    }
    await load();
  };

  const inputClass =
    "w-full px-3 py-2 border border-nfw-blackberry/20 bg-white text-sm font-ui text-nfw-blackberry focus:outline-none focus:border-nfw-aubergine disabled:bg-gray-100 disabled:cursor-not-allowed";

  const activeCount = passes.filter((p) => p.status === "active").length;
  const totalCount = passes.length;
  const summary = locked
    ? "Locked"
    : totalCount === 0
      ? null
      : activeCount === totalCount
        ? `${activeCount} active`
        : `${activeCount} active · ${totalCount} total`;

  return (
    <div className="bg-white border border-nfw-blackberry/10 mb-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`late-passes-${cycleId}`}
        className="w-full flex items-center gap-2 px-3 sm:px-4 py-3 text-left hover:bg-nfw-dove/50 transition-colors"
      >
        <KeyRound className="w-4 h-4 text-nfw-aubergine flex-shrink-0" />
        <span className="text-[11px] uppercase tracking-wide font-ui font-bold text-nfw-blackberry/50">
          Late submission passes
        </span>
        {!loading && summary && (
          <span
            className={`text-[11px] font-ui font-bold px-2 py-0.5 ${
              locked
                ? "bg-nfw-stone/40 text-nfw-blackberry/70"
                : activeCount > 0
                  ? "bg-green-100 text-green-800"
                  : "bg-nfw-dove text-nfw-blackberry/60"
            }`}
          >
            {summary}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 ml-auto text-nfw-blackberry/50 transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        id={`late-passes-${cycleId}`}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-nfw-blackberry/10 pt-3">
            <p className="text-sm font-serif text-nfw-blackberry/60 mb-3">
              Let a specific member apply to this cycle for 12 hours without
              reopening it publicly.
              {cycleStatus === "open" &&
                " (This cycle is currently open — passes only matter once it closes.)"}
            </p>

            {/* Persistent apply link — same URL for every pass on this cycle. */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 bg-nfw-dove border border-nfw-blackberry/10 p-2">
              <span className="text-[11px] uppercase tracking-wide font-ui font-bold text-nfw-blackberry/50 flex-shrink-0">
                Apply link
              </span>
              <code className="flex-1 min-w-0 truncate bg-white border border-nfw-blackberry/10 px-2 py-1.5 text-xs text-nfw-blackberry">
                {applyLink}
              </code>
              <button
                type="button"
                onClick={() => handleCopy("header")}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-nfw-blackberry/20 text-nfw-blackberry font-ui text-xs font-bold hover:bg-nfw-dove flex-shrink-0"
              >
                {copied === "header" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied === "header" ? "Copied" : "Copy link"}
              </button>
            </div>
            <p className="text-xs font-ui text-nfw-blackberry/50 -mt-2 mb-3">
              Only works for members with an active pass — anyone else sees the
              cycle as closed.
            </p>

            {locked ? (
              <div className="flex items-start gap-2 bg-nfw-dove border border-nfw-blackberry/10 p-3 text-sm font-ui text-nfw-blackberry/70">
                <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                First review is complete for this cycle, so late submissions are
                no longer allowed.
              </div>
            ) : (
              <form
                onSubmit={handleIssue}
                className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-2 items-start"
              >
                <input
                  type="email"
                  required
                  placeholder="Member email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  disabled={submitting}
                />
                <input
                  type="text"
                  required
                  minLength={5}
                  placeholder="Reason (e.g. upload failed before deadline)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={inputClass}
                  disabled={submitting}
                />
                <button
                  type="submit"
                  disabled={submitting || !email || reason.trim().length < 5}
                  className="w-full md:w-auto px-4 py-2 bg-nfw-aubergine text-white font-ui text-sm font-medium hover:bg-nfw-aubergine/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Granting…" : "Grant 12-hour pass"}
                </button>
              </form>
            )}

            {error && (
              <p className="mt-2 text-sm font-ui text-red-700 bg-red-50 border border-red-200 px-3 py-2">
                {error}
              </p>
            )}

            {notice && (
              <p className="mt-2 text-sm font-ui text-green-800 bg-green-50 border border-green-200 px-3 py-2">
                {notice}
              </p>
            )}

            {issuedFor && (
              <div className="mt-3 bg-green-50 border border-green-200 p-3">
                <p className="text-sm font-ui text-green-800 mb-2">
                  Pass granted for <strong>{issuedFor}</strong>. Send them this
                  link:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <code className="flex-1 min-w-0 truncate bg-white border border-green-200 px-2 py-1.5 text-xs">
                    {applyLink}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy("issued")}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-green-300 text-green-800 font-ui text-xs font-bold hover:bg-green-100"
                  >
                    {copied === "issued" ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copied === "issued" ? "Copied" : "Copy link"}
                  </button>
                </div>
              </div>
            )}

            {!loading && passes.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm font-ui">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-nfw-blackberry/50 border-b border-nfw-blackberry/10">
                      <th className="py-2 pr-3">Member</th>
                      <th className="py-2 pr-3">Reason</th>
                      <th className="py-2 pr-3">Granted</th>
                      <th className="py-2 pr-3">Expires</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {passes.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-nfw-blackberry/5 align-top"
                      >
                        <td className="py-2 pr-3">
                          <p className="text-nfw-blackberry">
                            {p.member?.full_name || "—"}
                          </p>
                          <p className="text-xs text-nfw-blackberry/50">
                            {p.member?.email}
                          </p>
                        </td>
                        <td className="py-2 pr-3 text-nfw-blackberry/70 max-w-xs break-words">
                          {p.reason}
                        </td>
                        <td className="py-2 pr-3 text-xs text-nfw-blackberry/60 whitespace-nowrap">
                          {formatET(p.created_at)}
                          {p.grantedBy?.full_name && (
                            <p>by {p.grantedBy.full_name}</p>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs text-nfw-blackberry/60 whitespace-nowrap">
                          {formatET(p.expires_at)}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-bold capitalize ${STATUS_STYLES[p.status]}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-3">
                            {p.status !== "used" && !locked && (
                              <button
                                type="button"
                                onClick={() => setExtendTarget(p)}
                                className="text-xs font-bold text-nfw-aubergine hover:underline"
                              >
                                Extend
                              </button>
                            )}
                            {p.status === "active" && (
                              <button
                                type="button"
                                onClick={() => setRevokeTarget(p)}
                                className="text-xs font-bold text-red-700 hover:underline"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!extendTarget}
        title="Extend Pass"
        message={`Give ${extendTarget?.member?.full_name || extendTarget?.member?.email || "this member"} 12 more hours (from now) to apply?${extendTarget?.status === "revoked" ? " This will also undo the revocation." : ""} The apply link stays the same.`}
        confirmLabel="Extend 12 hours"
        onConfirm={handleExtend}
        onCancel={() => setExtendTarget(null)}
      />

      <ConfirmModal
        isOpen={!!revokeTarget}
        title="Revoke Pass"
        message={`Revoke the late submission pass for ${revokeTarget?.member?.full_name || revokeTarget?.member?.email || "this member"}? They will no longer be able to apply to this cycle.`}
        confirmLabel="Revoke"
        variant="danger"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
