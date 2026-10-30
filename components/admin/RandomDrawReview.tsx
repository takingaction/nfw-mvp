"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Dices,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  Trophy,
  Undo2,
  XCircle,
} from "lucide-react";
import GrantApplicationScorer from "@/components/admin/GrantApplicationScorer";
import AiBadge from "@/components/admin/AiBadge";
import AiCriteriaList from "@/components/admin/AiCriteriaList";
import BulkSkipIrrelevantButton from "@/components/admin/BulkSkipIrrelevantButton";
import { isAiFlagPending, isAiSkipped } from "@/lib/grant-ai-flags";
import { isDrawEligible, type DrawRow, type DrawSummary } from "@/lib/grant-draw-rules";

type Phase = "first" | "second";
type Filter = "all" | "flagged" | "not_approved" | "eligible" | "winners";

interface ReviewGrant {
  id: string;
  user_id: string;
  who_are_you: string;
  biggest_challenge: string;
  fund_usage: string;
  is_nominating: boolean;
  nominee_name: string | null;
  status: string;
  submitted_at: string;
  ai_relevance: "relevant" | "irrelevant" | "uncertain" | "not_evaluated" | null;
  ai_reasoning: string | null;
  ai_criteria: unknown;
  eligibility_checks: unknown;
  ai_invalidated_at: string | null;
  ai_validated_at: string | null;
  profiles?: { full_name: string; email: string; city: string; state: string } | null;
  documents?: unknown[];
}

interface DrawResponse {
  cycle: {
    id: string;
    cycle_name: string | null;
    grants_available: number;
    scoring_completed_at: string | null;
    final_approved_at: string | null;
  };
  grants: ReviewGrant[];
  draws: DrawRow[];
  summary: DrawSummary;
  blockers: { draw: string | null; handoff: string | null; finalize: string | null };
  liveChecks: Record<string, unknown>;
  viewer: { isAdmin: boolean };
}

interface FinalizeResult {
  approved: { sent: number; failed: number; failed_emails: string[] };
  rejected: { sent: number; failed: number; failed_emails: string[] };
}

const DRAW_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  drawn: { label: "Drawn", cls: "bg-nfw-citrine/40 text-nfw-blackberry" },
  confirmed: { label: "Confirmed", cls: "bg-green-600 text-white" },
  rejected: { label: "Not approved", cls: "bg-red-600 text-white" },
};

export default function RandomDrawReview({ cycleId, phase }: { cycleId: string; phase: Phase }) {
  const [data, setData] = useState<DrawResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(phase === "second" ? "winners" : "all");
  const [visibleNames, setVisibleNames] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<null | "redraw" | "handoff" | "finalize" | "resume-approved" | "resume-rejected">(null);
  const [finalizeResult, setFinalizeResult] = useState<FinalizeResult | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ approved: number; rejected: number } | null>(null);

  // How many applicants have no email record yet (only meaningful once finalized).
  const loadEmailStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/final-approve`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.finalized) setEmailStatus(body.pending);
      else setEmailStatus(null);
    } catch {
      setEmailStatus(null);
    }
  }, [cycleId]);

  const load = useCallback(async () => {
    try {
      let res = await fetch(`/api/admin/grants/${cycleId}/draw`);
      let body = await res.json().catch(() => ({}));
      if (!res.ok && res.status === 400 && body.error === "Scoring has not started yet" && phase === "first") {
        const start = await fetch(`/api/admin/grants/${cycleId}/scoring/start`, { method: "POST" });
        if (!start.ok) {
          const sb = await start.json().catch(() => ({}));
          if (sb.error !== "Scoring has already started") throw new Error(sb.error || "Failed to start review");
        }
        res = await fetch(`/api/admin/grants/${cycleId}/draw`);
        body = await res.json().catch(() => ({}));
      }
      if (!res.ok) throw new Error(body.error || "Failed to load review");
      setData(body as DrawResponse);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load review");
    } finally {
      setLoading(false);
    }
  }, [cycleId, phase]);

  useEffect(() => {
    load();
  }, [load]);

  const finalizedAt = data?.cycle.final_approved_at ?? null;
  useEffect(() => {
    if (finalizedAt) loadEmailStatus();
  }, [finalizedAt, loadEmailStatus]);

  const drawByGrant = useMemo(() => {
    const m = new Map<string, DrawRow>();
    for (const d of data?.draws ?? []) if (d.status !== "voided") m.set(d.grant_id, d);
    return m;
  }, [data]);

  const grantById = useMemo(() => new Map((data?.grants ?? []).map((g) => [g.id, g])), [data]);

  const activeDraws = useMemo(
    () =>
      (data?.draws ?? [])
        .filter((d) => d.status !== "voided")
        .sort((a, b) => a.round - b.round || a.drawn_at.localeCompare(b.drawn_at)),
    [data],
  );

  const filtered = useMemo(() => {
    const list = data?.grants ?? [];
    const keep = (g: ReviewGrant) => {
      switch (filter) {
        case "flagged":
          return isAiFlagPending(g);
        case "not_approved":
          return isAiSkipped(g);
        case "eligible":
          return isDrawEligible(g);
        case "winners":
          return drawByGrant.has(g.id);
        default:
          return true;
      }
    };
    return list.filter(keep).sort((a, b) => {
      // Unresolved flags first so Review 1 works through them.
      const af = isAiFlagPending(a) ? 0 : 1;
      const bf = isAiFlagPending(b) ? 0 : 1;
      if (af !== bf) return af - bf;
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    });
  }, [data, filter, drawByGrant]);

  useEffect(() => {
    if (!selected && filtered.length > 0) setSelected(filtered[0].id);
  }, [filtered, selected]);

  const post = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "Action failed");
      await load();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const handoff = async () => {
    setBusy("handoff");
    setActionError("");
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/scoring/complete`, { method: "POST" });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "Failed to hand off");
      setModal(null);
      await load();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to hand off");
      setModal(null);
    } finally {
      setBusy(null);
    }
  };

  const finalize = async (resume: "approved" | "rejected" | null = null) => {
    setBusy("finalize");
    setActionError("");
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/final-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resume ? { resume } : {}),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "Failed to finalize approvals");
      setModal(null);
      setFinalizeResult({
        approved: {
          sent: out.approved?.sent || 0,
          failed: out.approved?.failed || 0,
          failed_emails: out.approved?.failed_emails || [],
        },
        rejected: {
          sent: out.rejected?.sent || 0,
          failed: out.rejected?.failed || 0,
          failed_emails: out.rejected?.failed_emails || [],
        },
      });
      await load();
      await loadEmailStatus();
    } catch (err: unknown) {
      // A network-level failure ("Failed to fetch") means the browser lost the
      // response, not that the server did nothing — the cycle may well be
      // finalized with emails sent. Refresh and say so instead of inviting a
      // blind retry.
      const networkFailure = err instanceof TypeError;
      setActionError(
        networkFailure
          ? "The server didn't respond before the connection closed. The cycle may still have been finalized and emails sent — this page has been refreshed to show the current state. Check the email status below before trying again."
          : err instanceof Error
            ? err.message
            : "Failed to finalize approvals",
      );
      setModal(null);
      await load();
      await loadEmailStatus();
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nfw-dove">
        <Loader2 className="w-8 h-8 animate-spin text-nfw-blackberry" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-8 bg-nfw-dove">
        <div className="max-w-7xl mx-auto bg-red-50 border border-red-200 p-6">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <AlertCircle className="w-5 h-5" />
            <h2 className="font-bold">Error</h2>
          </div>
          <p className="text-red-600">{error || "Failed to load review"}</p>
          <Link
            href={`/admin/grants/${cycleId}`}
            className="inline-flex items-center gap-2 mt-4 text-sm text-red-700 hover:text-red-800"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Grant
          </Link>
        </div>
      </div>
    );
  }

  const { cycle, summary, blockers, liveChecks, viewer } = data;
  const finalized = !!cycle.final_approved_at;
  const handedOff = !!cycle.scoring_completed_at;
  const locked = finalized;
  const selectedGrant = selected ? grantById.get(selected) : undefined;
  const selectedDraw = selected ? drawByGrant.get(selected) : undefined;
  const isReplacement = summary.rejected > 0 && summary.winners > 0;
  const drawLabel =
    summary.winners === 0
      ? `Draw ${summary.toDraw || summary.target} winner${(summary.toDraw || summary.target) === 1 ? "" : "s"}`
      : `Draw ${summary.toDraw} ${isReplacement ? "replacement" : "winner"}${summary.toDraw === 1 ? "" : "s"}`;

  const toggleName = (id: string) =>
    setVisibleNames((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: "all", label: "All", count: summary.total },
    { key: "flagged", label: "Needs decision", count: summary.flagPending },
    { key: "not_approved", label: "Not approved", count: summary.skipped },
    { key: "eligible", label: "Eligible", count: summary.eligible },
    { key: "winners", label: "Winners", count: activeDraws.length },
  ];

  return (
    <div className="min-h-screen bg-nfw-dove">
      {/* Header */}
      <div className="bg-white border-b border-nfw-blackberry/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
            <div className="flex items-center gap-4">
              <Link
                href={`/admin/grants/${cycleId}`}
                className="flex items-center gap-2 text-sm text-nfw-blackberry/50 hover:text-nfw-blackberry transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Grant
              </Link>
              <div>
                <h1 className="text-xl font-bold text-nfw-blackberry font-serif">
                  {phase === "first" ? "First Review · Random Draw" : "Second Review · Verify Winners"}
                </h1>
                {cycle.cycle_name && <p className="text-xs text-nfw-blackberry/50">{cycle.cycle_name}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {phase === "first" && !locked && (
                <BulkSkipIrrelevantButton cycleId={cycleId} refreshKey={data} onDone={() => load()} />
              )}
              {phase === "first" && (
                <button
                  onClick={() => setModal("handoff")}
                  disabled={handedOff || !!blockers.handoff || locked}
                  title={handedOff ? undefined : blockers.handoff ?? undefined}
                  className="px-4 py-2 bg-nfw-aubergine text-white font-bold text-sm hover:bg-nfw-aubergine/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {handedOff ? "Handed off to Reviewer 2" : "Hand off to Reviewer 2"}
                </button>
              )}
              {finalized && (
                <Link
                  href={`/admin/grants/${cycleId}/scoring/combined`}
                  className="px-4 py-2 bg-nfw-citrine text-nfw-blackberry font-bold text-sm hover:bg-nfw-citrine/80 flex items-center gap-2"
                >
                  Payments &amp; emails →
                </Link>
              )}
              {phase === "second" && (
                <button
                  onClick={() => setModal("finalize")}
                  disabled={finalized || !!blockers.finalize || !viewer.isAdmin}
                  title={
                    finalized
                      ? undefined
                      : !viewer.isAdmin
                        ? "Only admins can finalize approvals"
                        : blockers.finalize ?? undefined
                  }
                  className="px-4 py-2 bg-nfw-aubergine text-white font-bold text-sm hover:bg-nfw-aubergine/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  {finalized ? "Finalized" : "Finalize Approvals"}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-x-6 gap-y-2 text-xs flex-wrap">
            <Stat n={summary.total} label="Applications" cls="bg-nfw-stone/30 text-nfw-blackberry/70" />
            <Stat n={summary.flagPending} label="Need a decision" cls="bg-nfw-citrine/30 text-nfw-blackberry" />
            <Stat n={summary.skipped} label="Not approved" cls="bg-red-100 text-red-800" />
            <Stat n={summary.eligible} label="Eligible" cls="bg-green-100 text-green-800" />
            <Stat n={summary.poolRemaining} label="Left in pool" cls="bg-nfw-lilac/30 text-nfw-blackberry" />
            {summary.notEvaluated > 0 && (
              <Stat n={summary.notEvaluated} label="Awaiting AI review" cls="bg-yellow-100 text-yellow-800" />
            )}
          </div>
          {finalized && viewer.isAdmin && emailStatus && emailStatus.approved + emailStatus.rejected > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 space-y-2">
              <p>
                Some applicants have no email record. If emails may have gone out without being
                recorded, confirm in Resend before sending. Each type is sent separately.
              </p>
              <div className="flex flex-wrap gap-2">
                {emailStatus.approved > 0 && (
                  <button
                    onClick={() => setModal("resume-approved")}
                    disabled={busy === "finalize"}
                    className="px-3 py-1.5 bg-nfw-aubergine text-white font-bold text-xs hover:bg-nfw-aubergine/90 disabled:opacity-50"
                  >
                    Send {emailStatus.approved} approval email{emailStatus.approved === 1 ? "" : "s"}
                  </button>
                )}
                {emailStatus.rejected > 0 && (
                  <button
                    onClick={() => setModal("resume-rejected")}
                    disabled={busy === "finalize"}
                    className="px-3 py-1.5 bg-white border border-nfw-aubergine text-nfw-aubergine font-bold text-xs hover:bg-nfw-aubergine/5 disabled:opacity-50"
                  >
                    Send {emailStatus.rejected} not-approved email{emailStatus.rejected === 1 ? "" : "s"}
                  </button>
                )}
              </div>
            </div>
          )}
          {(actionError || (phase === "first" && handedOff && !finalized)) && (
            <div className="mt-3 space-y-1">
              {actionError && <p className="text-sm text-red-700">{actionError}</p>}
              {phase === "first" && handedOff && !finalized && (
                <p className="text-xs text-nfw-blackberry/60">
                  Handed off. Reviewer 2 verifies winners and draws replacements on the Second Review page.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Winners panel */}
        <div className="bg-white border border-nfw-blackberry/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-nfw-blackberry uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Winners {summary.winners}/{summary.target}
                <span className="font-normal normal-case tracking-normal text-nfw-blackberry/50">
                  · {summary.confirmed} confirmed
                  {summary.rejected > 0 ? ` · ${summary.rejected} not approved` : ""}
                </span>
              </h2>
              {!locked && blockers.draw && summary.winners < summary.target && (
                <p className="text-xs text-nfw-blackberry/60 mt-1">{blockers.draw}</p>
              )}
              {!locked && phase === "second" && blockers.finalize && (
                <p className="text-xs text-nfw-blackberry/60 mt-1">To finalize: {blockers.finalize}</p>
              )}
            </div>
            {!locked && (
              <div className="flex flex-wrap gap-2">
                {phase === "first" && !handedOff && summary.winners > 0 && (
                  <button
                    onClick={() => setModal("redraw")}
                    disabled={!!busy}
                    className="px-3 py-2 text-sm font-bold bg-nfw-stone/20 text-nfw-blackberry hover:bg-nfw-stone/30 disabled:opacity-50 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Redraw all
                  </button>
                )}
                <button
                  onClick={() => post("draw", { action: "draw" })}
                  disabled={!!busy || !!blockers.draw}
                  title={blockers.draw ?? undefined}
                  className="px-3 py-2 text-sm font-bold bg-nfw-aubergine text-white hover:bg-nfw-aubergine/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {busy === "draw" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dices className="w-4 h-4" />}
                  {drawLabel}
                </button>
              </div>
            )}
          </div>

          {activeDraws.length === 0 ? (
            <p className="text-sm text-nfw-blackberry/50">
              No winners drawn yet. Resolve every flagged application, then draw {summary.target} winner
              {summary.target === 1 ? "" : "s"} at random from the eligible applications.
            </p>
          ) : (
            <div className="divide-y divide-nfw-blackberry/10">
              {activeDraws.map((d) => {
                const g = grantById.get(d.grant_id);
                const pill = DRAW_STATUS_LABEL[d.status];
                const live = liveChecks[d.grant_id];
                return (
                  <div key={d.id} className="py-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-[11px] px-2 py-0.5 font-bold ${pill.cls}`}>{pill.label}</span>
                      <button
                        onClick={() => setSelected(d.grant_id)}
                        className="text-left min-w-0"
                      >
                        <span className="font-bold text-sm text-nfw-blackberry hover:underline">
                          {g?.profiles?.full_name || "Unknown"}
                        </span>
                        <span className="text-xs text-nfw-blackberry/50 ml-2">
                          Draw {d.round} · pool of {d.pool_size}
                        </span>
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <AiCriteriaList
                        compact
                        ai_criteria={g?.ai_criteria}
                        eligibility_checks={live ?? g?.eligibility_checks}
                      />
                      {!locked && (
                        <div className="flex gap-1">
                          {d.status === "drawn" && (
                            <button
                              onClick={() => post(`confirm-${d.grant_id}`, { action: "confirm", grantId: d.grant_id })}
                              disabled={!!busy}
                              className="px-2 py-1 text-xs font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Eligible
                            </button>
                          )}
                          {d.status !== "rejected" && (
                            <button
                              onClick={() => post(`reject-${d.grant_id}`, { action: "reject", grantId: d.grant_id })}
                              disabled={!!busy}
                              className="px-2 py-1 text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" /> Not approved
                            </button>
                          )}
                          {d.status !== "drawn" && (
                            <button
                              onClick={() => post(`undo-${d.grant_id}`, { action: "undo", grantId: d.grant_id })}
                              disabled={!!busy || (d.status === "rejected" && summary.winners >= summary.target)}
                              title={
                                d.status === "rejected" && summary.winners >= summary.target
                                  ? "A replacement was already drawn for this slot"
                                  : undefined
                              }
                              className="px-2 py-1 text-xs font-bold bg-nfw-stone/20 text-nfw-blackberry hover:bg-nfw-stone/30 disabled:opacity-50 flex items-center gap-1"
                            >
                              <Undo2 className="w-3 h-3" /> Undo
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Application list */}
          <div className="col-span-12 lg:col-span-5 flex flex-col">
            <div className="flex gap-2 flex-wrap mb-3">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setFilter(f.key);
                    setSelected(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    filter === f.key
                      ? "bg-nfw-blackberry text-white"
                      : "bg-nfw-stone/20 text-nfw-blackberry hover:bg-nfw-stone/30"
                  }`}
                >
                  {f.label}
                  <span className="opacity-60">({f.count})</span>
                </button>
              ))}
            </div>
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
              {filtered.length === 0 && (
                <p className="text-sm text-nfw-blackberry/50 p-4 bg-white border border-nfw-blackberry/10">
                  No applications in this view.
                </p>
              )}
              {filtered.map((g) => {
                const isSel = selected === g.id;
                const draw = drawByGrant.get(g.id);
                const nameShown = visibleNames.has(g.id) || !!draw;
                return (
                  <div
                    key={g.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(g.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelected(g.id);
                    }}
                    className={`p-3 cursor-pointer transition-all ${
                      isSel
                        ? "bg-nfw-aubergine text-white"
                        : "bg-white border border-nfw-blackberry/10 hover:border-nfw-blackberry/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold text-sm truncate ${isSel ? "text-white" : "text-nfw-blackberry"} ${nameShown ? "" : "opacity-40"}`}>
                            {nameShown ? g.profiles?.full_name || "Unknown" : "••••••"}
                          </p>
                          {!draw && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleName(g.id);
                              }}
                              className={`p-0.5 ${isSel ? "text-white/60 hover:text-white" : "text-nfw-blackberry/40 hover:text-nfw-blackberry"}`}
                              title={nameShown ? "Hide name" : "Show name"}
                            >
                              {nameShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                        <div className={`mt-1 ${isSel ? "[&_*]:!text-white" : ""}`}>
                          <AiCriteriaList compact ai_criteria={g.ai_criteria} eligibility_checks={g.eligibility_checks} />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <AiBadge
                          ai_relevance={g.ai_relevance}
                          ai_invalidated_at={g.ai_invalidated_at}
                          ai_validated_at={g.ai_validated_at}
                          compact
                          showRelevant
                        />
                        {draw && (
                          <span className={`text-[10px] px-1.5 py-0.5 font-bold ${DRAW_STATUS_LABEL[draw.status].cls}`}>
                            {DRAW_STATUS_LABEL[draw.status].label}
                          </span>
                        )}
                        {(!g.ai_relevance || g.ai_relevance === "not_evaluated") && (
                          <span className={`text-[10px] ${isSel ? "text-white/70" : "text-nfw-blackberry/40"}`}>
                            Awaiting AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail */}
          <div className="col-span-12 lg:col-span-7 space-y-3">
            {selectedGrant ? (
              <>
                <div className="bg-white border border-nfw-blackberry/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                      Eligibility criteria
                    </p>
                    {selectedDraw && (
                      <span className={`text-[11px] px-2 py-0.5 font-bold ${DRAW_STATUS_LABEL[selectedDraw.status].cls}`}>
                        Winner · {DRAW_STATUS_LABEL[selectedDraw.status].label}
                      </span>
                    )}
                  </div>
                  {criteriaOrPlaceholder(selectedGrant, selectedDraw ? liveChecks[selectedGrant.id] : undefined)}
                </div>
                <GrantApplicationScorer
                  key={selectedGrant.id}
                  grant={selectedGrant}
                  reviewerType={phase}
                  cycleId={locked ? undefined : cycleId}
                  onSave={() => {}}
                  onAiChange={load}
                  hidePersonalInfo={!selectedDraw && !visibleNames.has(selectedGrant.id)}
                  documents={selectedGrant.documents}
                  hideScoring
                  showAiCriteria={false}
                />
              </>
            ) : (
              <div className="bg-white border border-nfw-blackberry/10 p-8 text-center">
                <p className="text-nfw-blackberry/40">Select an application</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {modal === "redraw" && (
        <ConfirmModal
          title="Redraw all winners?"
          body={`This discards all ${summary.winners + summary.rejected} current draw results (including any confirmations) and draws ${summary.target} new winners from the full eligible pool. The discarded draws stay in the audit log.`}
          confirmLabel="Redraw"
          busy={busy === "redraw"}
          onCancel={() => setModal(null)}
          onConfirm={async () => {
            await post("redraw", { action: "redraw" });
            setModal(null);
          }}
        />
      )}
      {modal === "handoff" && (
        <ConfirmModal
          title="Hand off to Reviewer 2?"
          body={`Reviewer 2 will be notified to verify the ${summary.winners} drawn winner${summary.winners === 1 ? "" : "s"}. After hand-off you can no longer redraw the whole set; individual winners can still be marked not approved and replaced.`}
          confirmLabel="Hand off"
          busy={busy === "handoff"}
          onCancel={() => setModal(null)}
          onConfirm={handoff}
        />
      )}
      {modal === "finalize" && (
        <ConfirmModal
          title="Finalize Approvals?"
          body={`This will send "Grant: Approved" emails to the ${summary.confirmed} confirmed winner${summary.confirmed === 1 ? "" : "s"}, send "Grant: Not Approved" emails to all other applicants, and update all application statuses. This action cannot be undone.`}
          confirmLabel="Finalize"
          busy={busy === "finalize"}
          onCancel={() => setModal(null)}
          onConfirm={() => finalize(null)}
        />
      )}
      {(modal === "resume-approved" || modal === "resume-rejected") && emailStatus && (() => {
        const type = modal === "resume-approved" ? "approved" : "rejected";
        const n = type === "approved" ? emailStatus.approved : emailStatus.rejected;
        const label = type === "approved" ? "Grant: Approved" : "Grant: Not Approved";
        return (
          <ConfirmModal
            title={`Send ${n} "${label}" email${n === 1 ? "" : "s"}?`}
            body={`This emails only the ${n} ${type === "approved" ? "winner" : "applicant"}${n === 1 ? "" : "s"} with no "${label}" email record. Anyone already recorded as emailed is skipped, and no other email type is sent. Only continue if you've confirmed in Resend that these people were not already emailed.`}
            confirmLabel="Send"
            busy={busy === "finalize"}
            onCancel={() => setModal(null)}
            onConfirm={() => finalize(type)}
          />
        );
      })()}
      {finalizeResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-nfw-blackberry mb-3">Finalization Complete</h3>
            <div className="bg-green-50 p-4 mb-4 space-y-2 text-sm text-green-800">
              <p>
                <strong>Approved</strong> emails sent: {finalizeResult.approved.sent}/
                {finalizeResult.approved.sent + finalizeResult.approved.failed}
              </p>
              <p>
                <strong>Not approved</strong> emails sent: {finalizeResult.rejected.sent}/
                {finalizeResult.rejected.sent + finalizeResult.rejected.failed}
              </p>
              {[...finalizeResult.approved.failed_emails, ...finalizeResult.rejected.failed_emails].length > 0 && (
                <textarea
                  readOnly
                  className="w-full text-xs border p-1 bg-white text-red-700"
                  rows={2}
                  value={[...finalizeResult.approved.failed_emails, ...finalizeResult.rejected.failed_emails].join(", ")}
                />
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setFinalizeResult(null)}
                className="px-4 py-2 bg-nfw-aubergine text-white font-bold text-sm hover:bg-nfw-aubergine/90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function criteriaOrPlaceholder(g: ReviewGrant, live: unknown) {
  if (!g.ai_relevance || g.ai_relevance === "not_evaluated") {
    return <p className="text-sm text-nfw-blackberry/50">Awaiting AI review.</p>;
  }
  const hasCriteria = !!g.ai_criteria || !!g.eligibility_checks;
  if (!hasCriteria) {
    return (
      <p className="text-sm text-nfw-blackberry/50">
        Reviewed before per-criterion checks existed. Re-run the AI review for this cycle to see criteria.
      </p>
    );
  }
  return (
    <AiCriteriaList
      ai_criteria={g.ai_criteria}
      eligibility_checks={live ?? g.eligibility_checks}
      liveLabel={live ? "Checked just now" : undefined}
    />
  );
}

function Stat({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`px-2 py-0.5 rounded font-bold ${cls}`}>{n}</span>
      <span className="text-nfw-blackberry/60">{label}</span>
    </div>
  );
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-bold text-nfw-blackberry mb-2">{title}</h3>
        <p className="text-sm text-nfw-blackberry/70 mb-6">{body}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm font-bold text-nfw-blackberry/60 hover:text-nfw-blackberry disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 bg-nfw-aubergine text-white text-sm font-bold hover:bg-nfw-aubergine/90 disabled:opacity-50 flex items-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
