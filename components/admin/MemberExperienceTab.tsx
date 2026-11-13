"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Download, RefreshCw } from "lucide-react";
import { SITE_TZ, SITE_TZ_LABEL } from "@/lib/dates";

/**
 * Member Experience Baseline tab for /admin/analytics.
 * Data: /api/admin/analytics/experience → public.get_experience_baseline().
 * Definitions: MEMBER_EXPERIENCE_ANALYTICS.md
 */

type Pct = number | null;

type ExperienceBaseline = {
  meta: {
    generated_at: string;
    refreshed_at: string | null;
    start_sources: Record<string, number> | null;
  };
  activation: {
    cohort_from: string;
    cohort_size: number;
    windows: { days: number; eligible: number; activated: number; pct: Pct }[] | null;
    median_days_to_first: number | null;
    p75_days_to_first: number | null;
    median_days_to_second_program: number | null;
    reached_second_program: number;
    first_program: { program: string; members: number; pct: Pct }[];
  };
  cross_program: {
    eligible: number;
    by_count: { programs: number; members: number; pct: Pct }[];
    by_program: Record<"microgrants" | "store" | "perks" | "access_perks" | "nfw_perks", number>;
    top_paths: { path: string; members: number }[];
  };
  frequency: {
    member_months: number;
    pct_member_months_active: Pct;
    avg_engagements_per_member_month: number | null;
    members_with_completed_month: number;
    pct_members_active_every_month: Pct;
    median_days_between_engagements: number | null;
    avg_days_between_engagements: number | null;
    monthly: { month: string; members: number; active: number; pct_active: Pct; avg_engagements: number | null }[];
  };
  retention: {
    active_30: number;
    active_60: number;
    active_90: number;
    never_engaged: number;
    eligible: number;
    survival: { month: number; members: number; active: number; pct: Pct }[];
    lapsed_last_program: { program: string; members: number }[];
    after_first_grant_decision: {
      outcome: "approved" | "rejected";
      members: number;
      reengaged_30d: number;
      pct_reengaged_30d: Pct;
      reengaged_ever: number;
      pct_reengaged_ever: Pct;
      applied_again: number;
      pct_applied_again: Pct;
    }[];
  };
  repeat: {
    store: { members: number; repeat_members: number; pct_repeat: Pct; avg_months_claimed: number | null };
    access_perks: { members: number; repeat_members: number; pct_repeat: Pct; avg_redemptions: number | null };
    nfw_perks: { members: number; repeat_members: number; pct_repeat: Pct; avg_redemptions: number | null };
    microgrants: { members: number; repeat_members: number; pct_repeat: Pct; avg_submissions: number | null };
  };
  contributions: {
    contributors: number;
    pct_contributors: Pct;
    submissions: number;
    by_kind: { kind: string; submissions: number; members: number }[];
  };
  evangelism: {
    gift_members: number;
    pct_gift_members: Pct;
  };
};

const PROGRAM_LABELS: Record<string, string> = {
  microgrants: "Microgrants",
  store: "Zero Dollar Store",
  perks: "Perks",
  access_perks: "Access Perks",
  nfw_perks: "NFW Perks",
};

const START_SOURCE_LABELS: Record<string, string> = {
  paid: "Paid (first payment)",
  gift: "Gift code redemption",
  free_approved: "Free: approval recorded",
  free_joined_at: "Free: approved at signup (joined date)",
  free_estimated: "Free: estimated start",
  paid_estimated: "Paid: no first payment date",
};

const programLabel = (p: string) =>
  p
    .split(" > ")
    .map((x) => PROGRAM_LABELS[x] ?? x)
    .join(" → ");

const fmtNum = (n: number | null | undefined) => (n == null ? "–" : n.toLocaleString("en-US"));
const fmtPct = (p: Pct | undefined) => (p == null ? "–" : `${p}%`);
const pctOf = (n: number, d: number) => (d > 0 ? Math.round((1000 * n) / d) / 10 : null);

/** Days → readable duration ("21 min", "6 hrs", "6.9 days"). */
function fmtDays(days: number | null | undefined): string {
  if (days == null) return "–";
  const minutes = days * 24 * 60;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  if (days < 1) return `${Math.round(minutes / 60)} hrs`;
  return `${Math.round(days * 10) / 10} days`;
}

function fmtSiteDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  return (
    new Date(iso).toLocaleString("en-US", {
      timeZone: SITE_TZ,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) + ` ${SITE_TZ_LABEL}`
  );
}

function fmtMonth(isoDate: string): string {
  // isoDate is a Pacific calendar month ("2026-09-01"); render as written.
  return new Date(isoDate + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-nfw-blackberry/10 p-6">
      <h3 className="font-black text-nfw-blackberry mb-1 font-ui">{title}</h3>
      {note && <p className="text-xs text-nfw-blackberry/60 mb-4">{note}</p>}
      {!note && <div className="mb-3" />}
      {children}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-nfw-blackberry/10 p-4">
      <div className="text-xl font-black text-nfw-blackberry">{value}</div>
      <div className="text-xs font-semibold text-nfw-blackberry/70">{label}</div>
      {sub && <div className="text-xs text-nfw-blackberry/50 mt-1">{sub}</div>}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-nfw-blackberry/10">
            {head.map((h, i) => (
              <th
                key={h}
                className={`py-2 px-3 font-black text-nfw-blackberry ${i === 0 ? "text-left" : "text-right"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-nfw-blackberry/5">
              {r.map((c, ci) => (
                <td
                  key={ci}
                  className={`py-2 px-3 text-nfw-blackberry ${ci === 0 ? "text-left font-medium" : "text-right tabular-nums"}`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildCsv(d: ExperienceBaseline): string {
  const rows: (string | number | null)[][] = [["Section", "Metric", "Value", "Denominator / note"]];
  const a = d.activation;
  rows.push(["Meta", "Data refreshed", d.meta.refreshed_at ?? "", ""]);
  rows.push(["Activation", "Cohort (exact start, from)", a.cohort_size, a.cohort_from]);
  for (const w of a.windows ?? []) {
    rows.push(["Activation", `First engaged within ${w.days === 0 ? "24 hours" : `${w.days} days`} of joining (%)`, w.pct, `${w.activated} of ${w.eligible} members who joined at least that long ago`]);
  }
  rows.push(["Activation", "Median days to first engagement", a.median_days_to_first, ""]);
  rows.push(["Activation", "75th percentile days to first engagement", a.p75_days_to_first, ""]);
  rows.push(["Activation", "Median days to second program", a.median_days_to_second_program, `${a.reached_second_program} reached a second program`]);
  for (const f of a.first_program) rows.push(["Activation", `First program: ${programLabel(f.program)} (%)`, f.pct, `${f.members} members`]);
  const c = d.cross_program;
  for (const b of c.by_count) rows.push(["Cross-program", `Using ${b.programs} programs (%)`, b.pct, `${b.members} of ${c.eligible}`]);
  for (const [k, v] of Object.entries(c.by_program)) rows.push(["Cross-program", `Ever used ${programLabel(k)}`, v, `of ${c.eligible}`]);
  for (const p of c.top_paths) rows.push(["Cross-program", `Pathway: ${programLabel(p.path)}`, p.members, ""]);
  const f = d.frequency;
  rows.push(["Frequency", "Member-months with ≥1 engagement (%)", f.pct_member_months_active, `${f.member_months} completed member-months`]);
  rows.push(["Frequency", "Members active every completed month (%)", f.pct_members_active_every_month, `${f.members_with_completed_month} members`]);
  rows.push(["Frequency", "Avg engagements per member per month", f.avg_engagements_per_member_month, ""]);
  rows.push(["Frequency", "Median days between engagements", f.median_days_between_engagements, ""]);
  rows.push(["Frequency", "Average days between engagements", f.avg_days_between_engagements, ""]);
  for (const m of f.monthly) rows.push(["Frequency", `Month ${m.month}: % active`, m.pct_active, `${m.members} members; avg ${m.avg_engagements}`]);
  const r = d.retention;
  rows.push(["Retention", "Active last 30 days", r.active_30, `of ${r.eligible}`]);
  rows.push(["Retention", "Active last 60 days", r.active_60, `of ${r.eligible}`]);
  rows.push(["Retention", "Active last 90 days", r.active_90, `of ${r.eligible}`]);
  rows.push(["Retention", "Never engaged", r.never_engaged, `of ${r.eligible}`]);
  for (const s of r.survival) rows.push(["Retention", `Active in month ${s.month} after start (%)`, s.pct, `${s.active} of ${s.members}`]);
  for (const l of r.lapsed_last_program) rows.push(["Retention", `Lapsed (60d+) after last using ${programLabel(l.program)}`, l.members, ""]);
  for (const g of r.after_first_grant_decision) {
    rows.push(["Retention", `First grant ${g.outcome}: re-engaged within 30 days (%)`, g.pct_reengaged_30d, `${g.reengaged_30d} of ${g.members}`]);
    rows.push(["Retention", `First grant ${g.outcome}: re-engaged ever (%)`, g.pct_reengaged_ever, `${g.reengaged_ever} of ${g.members}`]);
    rows.push(["Retention", `First grant ${g.outcome}: applied again (%)`, g.pct_applied_again, `${g.applied_again} of ${g.members}`]);
  }
  const rp = d.repeat;
  rows.push(["Repeat", "Store: claimed in 2+ months (%)", rp.store.pct_repeat, `${rp.store.repeat_members} of ${rp.store.members}`]);
  rows.push(["Repeat", "Access Perks: 2+ redemptions (%)", rp.access_perks.pct_repeat, `${rp.access_perks.repeat_members} of ${rp.access_perks.members}`]);
  rows.push(["Repeat", "NFW Perks: 2+ redemptions (%)", rp.nfw_perks.pct_repeat, `${rp.nfw_perks.repeat_members} of ${rp.nfw_perks.members}`]);
  rows.push(["Repeat", "Microgrants: 2+ applications (%)", rp.microgrants.pct_repeat, `${rp.microgrants.repeat_members} of ${rp.microgrants.members}`]);
  rows.push(["Contributions", "Members who submitted a form (%)", d.contributions.pct_contributors, `${d.contributions.contributors} members`]);
  for (const k of d.contributions.by_kind) rows.push(["Contributions", k.kind, k.submissions, `${k.members} members`]);
  rows.push(["Evangelism", "Members who joined via gift code", d.evangelism.gift_members, `${d.evangelism.pct_gift_members}%`]);
  return rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export default function MemberExperienceTab() {
  const [data, setData] = useState<ExperienceBaseline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh: boolean) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics/experience", { method: refresh ? "POST" : "GET" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json as ExperienceBaseline);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const downloadCsv = () => {
    if (!data) return;
    const blob = new Blob([buildCsv(data)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nfw-member-experience-baseline.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="h-64 bg-gray-100 animate-pulse flex items-center justify-center">
        <p className="text-gray-500">Loading member experience baseline...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-nfw-blackberry/10 p-6 text-sm text-nfw-blackberry">
        {error ?? "No data"}.{" "}
        <button onClick={() => load(false)} className="underline font-semibold">
          Try again
        </button>
      </div>
    );
  }

  const { activation: a, cross_program: c, frequency: f, retention: r, repeat: rp } = data;
  const eligible = c.eligible;
  const day30 = a.windows?.find((w) => w.days === 30);
  const twoPlus = c.by_count.filter((b) => b.programs >= 2).reduce((s, b) => s + b.members, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-nfw-blackberry/70">
        <p>
          All-time baseline of <strong className="text-nfw-blackberry">{fmtNum(eligible)}</strong> eligible members
          (contributing, founding and approved free; admins and test accounts excluded). Data refreshed{" "}
          {fmtSiteDateTime(data.meta.refreshed_at)}; refreshes nightly.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-nfw-blackberry/10 text-sm font-semibold text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh now"}
          </button>
          <button
            onClick={downloadCsv}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-nfw-blackberry/10 text-sm font-semibold text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Headline cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Eligible members", value: fmtNum(eligible), color: "bg-nfw-blackberry" },
          { label: "Engaged within 30 days of joining", value: fmtPct(day30?.pct ?? null), color: "bg-nfw-wisteria" },
          { label: "Active in last 30 days", value: fmtPct(pctOf(r.active_30, eligible)), color: "bg-nfw-aubergine" },
          { label: "Using 2+ programs", value: fmtPct(pctOf(twoPlus, eligible)), color: "bg-nfw-wisteria" },
        ].map((card) => (
          <div key={card.label} className={`${card.color} p-5`}>
            <div className="text-2xl font-black mb-1 text-white">{card.value}</div>
            <div className="text-xs font-semibold text-white opacity-70">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Activation */}
      <Panel
        title="Activation"
        note={`New members starting ${a.cohort_from} or later with an exact start date (${fmtNum(a.cohort_size)} members). Engaged = completed a microgrant application, Store claim or perk redemption.`}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi label="Median time to first engagement" value={fmtDays(a.median_days_to_first)} sub={`75% within ${fmtDays(a.p75_days_to_first)}`} />
          <Kpi
            label="Reached a second program"
            value={fmtNum(a.reached_second_program)}
            sub={`${fmtPct(pctOf(a.reached_second_program, a.cohort_size))} of cohort`}
          />
          <Kpi label="Median time to second program" value={fmtDays(a.median_days_to_second_program)} />
          <Kpi
            label="Most common first program"
            value={a.first_program[0] ? programLabel(a.first_program[0].program) : "–"}
            sub={a.first_program[0] ? `${fmtPct(a.first_program[0].pct)} of activated` : undefined}
          />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <Table
              head={["Window", "Joined ≥ this long ago", "First engaged within window", "%"]}
              rows={(a.windows ?? []).map((w) => [
                w.days === 0 ? "24 hours" : `${w.days} days`,
                fmtNum(w.eligible),
                fmtNum(w.activated),
                fmtPct(w.pct),
              ])}
            />
            <p className="text-xs text-nfw-blackberry/60 mt-2">
              Each row is a different group: only members whose full window has passed are counted, so newer
              members drop out of the longer windows. Compare rows by %, not by count.
            </p>
          </div>
          <Table
            head={["First program", "Members", "%"]}
            rows={a.first_program.map((p) => [programLabel(p.program), fmtNum(p.members), fmtPct(p.pct)])}
          />
        </div>
      </Panel>

      {/* Cross-program */}
      <Panel title="Cross-program engagement" note="All eligible members, all time. Access Perks and NFW Perks both count as Perks.">
        <div className="grid lg:grid-cols-3 gap-6">
          <Table
            head={["Programs used", "Members", "%"]}
            rows={c.by_count.map((b) => [
              b.programs === 3 ? "All 3" : String(b.programs),
              fmtNum(b.members),
              fmtPct(b.pct ?? pctOf(b.members, eligible)),
            ])}
          />
          <Table
            head={["Program", "Members ever", "%"]}
            rows={(["microgrants", "store", "perks", "access_perks", "nfw_perks"] as const).map((k) => [
              k === "access_perks" || k === "nfw_perks" ? `  ↳ ${PROGRAM_LABELS[k]}` : PROGRAM_LABELS[k],
              fmtNum(c.by_program[k]),
              fmtPct(pctOf(c.by_program[k], eligible)),
            ])}
          />
          <Table head={["Most common pathways", "Members"]} rows={c.top_paths.map((p) => [programLabel(p.path), fmtNum(p.members)])} />
        </div>
      </Panel>

      {/* Frequency */}
      <Panel
        title="Frequency"
        note="Completed Pacific months only, from each member's start month. The current month is excluded."
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi label="Member-months with an engagement" value={fmtPct(f.pct_member_months_active)} sub={`${fmtNum(f.member_months)} member-months`} />
          <Kpi
            label="Engaged every month since joining"
            value={fmtPct(f.pct_members_active_every_month)}
            sub={`${fmtNum(f.members_with_completed_month)} members with 1+ full month`}
          />
          <Kpi label="Engagements per member per month" value={f.avg_engagements_per_member_month == null ? "–" : String(f.avg_engagements_per_member_month)} />
          <Kpi
            label="Time between engagements"
            value={`${fmtDays(f.median_days_between_engagements)} median`}
            sub={`${fmtDays(f.avg_days_between_engagements)} average`}
          />
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={f.monthly.map((m) => ({ ...m, label: fmtMonth(m.month) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="%" />
            <Tooltip formatter={(v) => [`${v}%`, "Members active"]} />
            <Bar dataKey="pct_active" fill="#7786BE" />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Retention */}
      <Panel title="Retention" note="Active = completed at least one program action in the window (separate from membership status).">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi label="Active in last 30 days" value={fmtPct(pctOf(r.active_30, r.eligible))} sub={fmtNum(r.active_30)} />
          <Kpi label="Active in last 60 days" value={fmtPct(pctOf(r.active_60, r.eligible))} sub={fmtNum(r.active_60)} />
          <Kpi label="Active in last 90 days" value={fmtPct(pctOf(r.active_90, r.eligible))} sub={fmtNum(r.active_90)} />
          <Kpi label="Never engaged" value={fmtPct(pctOf(r.never_engaged, r.eligible))} sub={fmtNum(r.never_engaged)} />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-nfw-blackberry/70 mb-2">
              Where engagement drops off: % active in each 30-day period after joining
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={r.survival.map((s) => ({ ...s, label: `M${s.month}` }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                  formatter={(v, _n, item) => [`${v}% of ${fmtNum((item?.payload as { members?: number })?.members)}`, "Active"]}
                />
                <Line type="monotone" dataKey="pct" stroke="#3E145F" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-6">
            <Table
              head={["After first microgrant decision", "Members", "Back in 30 days", "Ever back", "Applied again"]}
              rows={r.after_first_grant_decision.map((g) => [
                g.outcome === "approved" ? "Approved" : "Not approved",
                fmtNum(g.members),
                fmtPct(g.pct_reengaged_30d),
                fmtPct(g.pct_reengaged_ever),
                fmtPct(g.pct_applied_again),
              ])}
            />
            <Table
              head={["Lapsed (no activity 60+ days): last program", "Members"]}
              rows={r.lapsed_last_program.map((l) => [programLabel(l.program), fmtNum(l.members)])}
            />
          </div>
        </div>
      </Panel>

      {/* Repeat */}
      <Panel title="What brings members back" note="Repeat use per program, among members who used it at least once.">
        <Table
          head={["Program", "Members", "Came back", "%", "Average"]}
          rows={[
            ["Zero Dollar Store (claims in 2+ months)", fmtNum(rp.store.members), fmtNum(rp.store.repeat_members), fmtPct(rp.store.pct_repeat), `${rp.store.avg_months_claimed ?? "–"} months`],
            ["Access Perks (2+ redemptions)", fmtNum(rp.access_perks.members), fmtNum(rp.access_perks.repeat_members), fmtPct(rp.access_perks.pct_repeat), `${rp.access_perks.avg_redemptions ?? "–"} redemptions`],
            ["NFW Perks (2+ redemptions)", fmtNum(rp.nfw_perks.members), fmtNum(rp.nfw_perks.repeat_members), fmtPct(rp.nfw_perks.pct_repeat), `${rp.nfw_perks.avg_redemptions ?? "–"} redemptions`],
            ["Microgrants (2+ applications)", fmtNum(rp.microgrants.members), fmtNum(rp.microgrants.repeat_members), fmtPct(rp.microgrants.pct_repeat), `${rp.microgrants.avg_submissions ?? "–"} applications`],
          ]}
        />
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Contributions */}
        <Panel
          title="Stories, content & feedback"
          note="All member form submissions (Share Your Story + contact form), excluding the Free Membership Request application."
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Kpi label="Members who submitted" value={fmtNum(data.contributions.contributors)} sub={`${fmtPct(data.contributions.pct_contributors)} of eligible`} />
            <Kpi label="Submissions" value={fmtNum(data.contributions.submissions)} />
          </div>
          <Table
            head={["Form", "Submissions", "Members"]}
            rows={data.contributions.by_kind.map((k) => [
              k.kind === "story" ? "Share Your Story" : k.kind.replace(/^contact: /, "Contact: "),
              fmtNum(k.submissions),
              fmtNum(k.members),
            ])}
          />
        </Panel>

        {/* Evangelism + coming soon */}
        <div className="space-y-6">
          <Panel title="Evangelism">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <Kpi label="Joined via gift code" value={fmtNum(data.evangelism.gift_members)} sub={`${fmtPct(data.evangelism.pct_gift_members)} of eligible`} />
            </div>
            <p className="text-xs text-nfw-blackberry/60">
              Referral rate and member-attributed acquisition (MAC) are not tracked yet. See MEMBER_EXPERIENCE_ANALYTICS.md, Phase 3.
            </p>
          </Panel>
          <Panel title="Communications">
            <p className="text-xs text-nfw-blackberry/60">
              Email open and click rates, and which emails lead to program activity, need Resend open/click tracking
              and Flodesk report imports (Phase 2).
            </p>
          </Panel>
          <Panel title="How start dates were determined">
            <Table
              head={["Start date source", "Members"]}
              rows={Object.entries(data.meta.start_sources ?? {})
                .sort((x, y) => y[1] - x[1])
                .map(([k, v]) => [START_SOURCE_LABELS[k] ?? k, fmtNum(v)])}
            />
            <p className="text-xs text-nfw-blackberry/60 mt-3">
              Estimated start dates are left out of Activation timing but included everywhere else.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
