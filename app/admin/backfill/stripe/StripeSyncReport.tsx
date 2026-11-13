"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReasonKey, ReconResult, ReconRow } from "@/lib/stripe-member-reconciliation";

type ReportResponse = ReconResult & {
  snapshot: { fetchedAt: string; subscriptionCount: number; apiCalls: number; warning: string | null };
};

const STALE_AFTER_MS = 2 * 60 * 60 * 1000;

function escapeCsv(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function fmtDate(sec: number | null): string {
  if (!sec) return "";
  return new Date(sec * 1000).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" });
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/**
 * "Why aren't we in sync with Stripe?" Paid members in our database vs
 * Stripe subscriptions in good standing, with the gap broken down by reason.
 * Read-only: nothing here changes member data.
 */
export default function StripeSyncReport() {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<ReasonKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/backfill/stripe/member-reconciliation");
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed to load (${res.status})`);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Same refresh as the Reconciliation panel's button: fetches from Stripe and
  // rewrites both caches.
  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/backfill/stripe/reconcile?fresh=true");
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) throw new Error(json?.error || `Refresh failed (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const rowsByReason = useMemo(() => {
    const m = new Map<ReasonKey, ReconRow[]>();
    for (const r of data?.rows ?? []) {
      if (!m.has(r.reason)) m.set(r.reason, []);
      m.get(r.reason)!.push(r);
    }
    return m;
  }, [data]);

  const exportCsv = (key: ReasonKey) => {
    const rows = rowsByReason.get(key) ?? [];
    const header = ["Email", "Name", "DB level", "DB status", "Stripe customer", "Stripe subscription", "Stripe status", "Stripe tier", "Ended", "Note", "Profile id"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [r.email, r.full_name, r.db_level, r.db_status, r.stripe_customer_id, r.stripe_subscription_id, r.stripe_status, r.stripe_tier, fmtDate(r.ended_at), r.note, r.profile_id]
          .map(escapeCsv)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stripe-sync-${key}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchedAt = data ? new Date(data.snapshot.fetchedAt) : null;
  const stale = fetchedAt ? Date.now() - fetchedAt.getTime() > STALE_AFTER_MS : false;
  const gapGroups = data?.groups.filter((g) => g.side !== "info") ?? [];
  const infoGroups = data?.groups.filter((g) => g.side === "info") ?? [];
  const unexpected = gapGroups.filter((g) => !g.expected).reduce((sum, g) => sum + g.effect, 0);

  return (
    <section className="bg-white border border-nfw-blackberry/10 p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="font-ui font-bold text-lg text-nfw-aubergine">Why aren&apos;t we in sync with Stripe?</h2>
          <p className="text-xs text-nfw-blackberry/60 mt-1 max-w-2xl">
            Paid members in our database (contributing or founding, not admins) vs Stripe subscriptions in good standing
            (active or trialing; set-to-cancel still counts). Every member or subscription that doesn&apos;t line up is listed
            once below with the reason. Read-only: nothing here changes member data.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {fetchedAt && (
            <span className={`text-xs font-ui ${stale ? "text-red-600 font-bold" : "text-nfw-blackberry/50"}`}>
              Stripe data from {fetchedAt.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })} ET
              {stale ? " (stale)" : ""}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing || loading}
            className="px-4 py-2 bg-nfw-aubergine text-white text-sm font-ui font-semibold hover:bg-nfw-aubergine/90 disabled:opacity-50"
          >
            {refreshing ? "Fetching from Stripe… (about a minute)" : "Refresh from Stripe"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading && !data && <p className="text-sm text-nfw-blackberry/50">Loading…</p>}
      {data?.snapshot.warning && <p className="text-xs text-orange-600 mb-3">Note: {data.snapshot.warning}.</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card label="Paid members in DB" value={data.dbPaid.toLocaleString()} sub={`${data.byTier.db.contributing.toLocaleString()} contributing · ${data.byTier.db.founding} founding`} />
            <Card
              label="Stripe subscriptions in good standing"
              value={data.stripeGoodStanding.toLocaleString()}
              sub={`${data.byTier.stripe.contributing.toLocaleString()} contributing · ${data.byTier.stripe.founding} founding${data.byTier.stripe.other ? ` · ${data.byTier.stripe.other} other price` : ""}`}
            />
            <Card label="Gap (DB − Stripe)" value={signed(data.gap)} tone={data.gap === 0 ? "good" : "bad"} />
            <Card
              label="Unexplained by expected cases"
              value={signed(unexpected)}
              sub="Gap minus gift members and admin subscriptions"
              tone={unexpected === 0 ? "good" : "bad"}
            />
          </div>

          <h3 className="font-ui font-bold text-sm text-nfw-blackberry mb-2">What makes up the gap</h3>
          {gapGroups.length === 0 ? (
            <p className="text-sm text-green-700 mb-6">Every paid member matches a Stripe subscription, and vice versa.</p>
          ) : (
            <ReasonTable
              groups={gapGroups}
              showEffect
              open={open}
              setOpen={setOpen}
              rowsByReason={rowsByReason}
              exportCsv={exportCsv}
              footer={
                <tr className="border-t-2 border-nfw-blackberry/20 font-bold">
                  <td className="py-2 px-3">Total</td>
                  <td />
                  <td className="py-2 px-3 text-right">{signed(data.explained)}</td>
                  <td colSpan={2} className="py-2 px-3 text-xs font-normal text-nfw-blackberry/50">
                    {data.explained === data.gap ? "Adds up to the gap exactly." : `Doesn't match the gap (${signed(data.gap)}). Please report this.`}
                  </td>
                </tr>
              }
            />
          )}

          {infoGroups.length > 0 && (
            <>
              <h3 className="font-ui font-bold text-sm text-nfw-blackberry mt-6 mb-2">Matched, but worth fixing</h3>
              <p className="text-xs text-nfw-blackberry/50 mb-2">These members match a subscription, so they don&apos;t affect the gap.</p>
              <ReasonTable groups={infoGroups} open={open} setOpen={setOpen} rowsByReason={rowsByReason} exportCsv={exportCsv} />
            </>
          )}
        </>
      )}
    </section>
  );
}

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-green-700" : tone === "bad" ? "text-red-600" : "text-nfw-aubergine";
  return (
    <div className="bg-nfw-dove/60 p-4">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs font-ui font-semibold text-nfw-blackberry/70 mt-1">{label}</div>
      {sub && <div className="text-xs text-nfw-blackberry/50 mt-1">{sub}</div>}
    </div>
  );
}

function ReasonTable({
  groups,
  showEffect,
  open,
  setOpen,
  rowsByReason,
  exportCsv,
  footer,
}: {
  groups: ReconResult["groups"];
  showEffect?: boolean;
  open: ReasonKey | null;
  setOpen: (k: ReasonKey | null) => void;
  rowsByReason: Map<ReasonKey, ReconRow[]>;
  exportCsv: (key: ReasonKey) => void;
  footer?: React.ReactNode;
}) {
  return (
    <table className="w-full text-sm mb-2">
      <thead>
        <tr className="text-left text-xs font-ui uppercase tracking-wide text-nfw-blackberry/50 border-b border-nfw-blackberry/10">
          <th className="py-2 px-3">Reason</th>
          <th className="py-2 px-3 text-right">Members</th>
          <th className="py-2 px-3 text-right">{showEffect ? "Effect on gap" : ""}</th>
          <th className="py-2 px-3" />
          <th className="py-2 px-3" />
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => {
          const isOpen = open === g.key;
          const rows = rowsByReason.get(g.key) ?? [];
          return (
            <ReasonRows key={g.key} g={g} isOpen={isOpen} rows={rows} showEffect={showEffect} onToggle={() => setOpen(isOpen ? null : g.key)} onExport={() => exportCsv(g.key)} />
          );
        })}
        {footer}
      </tbody>
    </table>
  );
}

function ReasonRows({
  g,
  isOpen,
  rows,
  showEffect,
  onToggle,
  onExport,
}: {
  g: ReconResult["groups"][number];
  isOpen: boolean;
  rows: ReconRow[];
  showEffect?: boolean;
  onToggle: () => void;
  onExport: () => void;
}) {
  return (
    <>
      <tr className="border-b border-nfw-blackberry/5 align-top">
        <td className="py-2 px-3">
          <div className="font-semibold text-nfw-blackberry">
            {g.label}
            {g.expected && <span className="ml-2 text-xs font-normal text-green-700">expected</span>}
          </div>
          <div className="text-xs text-nfw-blackberry/50 mt-0.5 max-w-xl">{g.description}</div>
        </td>
        <td className="py-2 px-3 text-right font-bold">{g.count.toLocaleString()}</td>
        <td className="py-2 px-3 text-right font-bold">{showEffect ? signed(g.effect) : ""}</td>
        <td className="py-2 px-3 text-right whitespace-nowrap">
          <button type="button" onClick={onToggle} className="text-xs font-ui font-bold text-nfw-aubergine hover:underline">
            {isOpen ? "Hide" : "Show"}
          </button>
        </td>
        <td className="py-2 px-3 text-right whitespace-nowrap">
          <button type="button" onClick={onExport} className="text-xs font-ui font-bold text-nfw-aubergine hover:underline">
            CSV
          </button>
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={5} className="p-0">
            <div className="max-h-96 overflow-y-auto bg-nfw-dove/40 border-y border-nfw-blackberry/10">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-nfw-blackberry/60">
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">DB</th>
                    <th className="px-3 py-2">Stripe</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.profile_id ?? ""}-${r.stripe_subscription_id ?? ""}-${i}`} className="border-t border-nfw-blackberry/5">
                      <td className="px-3 py-1.5">
                        <div className="text-nfw-blackberry">{r.email ?? <span className="italic text-nfw-blackberry/40">no email</span>}</div>
                        {r.full_name && <div className="text-nfw-blackberry/50">{r.full_name}</div>}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {r.db_level ?? "no profile"}
                        {r.db_status ? ` · ${r.db_status}` : ""}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {r.stripe_customer_id ? (
                          <a
                            href={`https://dashboard.stripe.com/customers/${r.stripe_customer_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-nfw-aubergine hover:underline"
                          >
                            {r.stripe_status ? `${r.stripe_tier ?? ""} · ${r.stripe_status}` : "customer"}
                          </a>
                        ) : (
                          <span className="text-nfw-blackberry/40">none</span>
                        )}
                        {r.ended_at ? <span className="text-nfw-blackberry/50"> · ended {fmtDate(r.ended_at)}</span> : null}
                      </td>
                      <td className="px-3 py-1.5 text-nfw-blackberry/60">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
