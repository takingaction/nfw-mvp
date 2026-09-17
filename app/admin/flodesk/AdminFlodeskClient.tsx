"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Rule {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  delay_days: number;
  flodesk_segment_id: string | null;
  flodesk_segment_name: string | null;
  remove_on_exit: boolean;
  is_enabled: boolean;
  last_run_at: string | null;
  counts: { added: number; removed: number; failed: number };
}

interface Segment {
  id: string;
  name: string;
  total_active_subscribers: number | null;
}

interface Status {
  configured: boolean;
  connection: { ok: boolean; segmentCount?: number; error?: string };
  recentFailures: (
    | {
        type: "profile";
        ruleId: string;
        ruleName: string;
        profileId: string;
        email: string | null;
        fullName: string | null;
        attemptCount: number;
        lastError: string | null;
        updatedAt: string;
      }
    | {
        type: "email";
        ruleId: string;
        ruleName: string;
        profileId: null;
        email: string | null;
        fullName: null;
        attemptCount: number;
        lastError: string | null;
        updatedAt: string;
      }
  )[];
  newsletterSignupCount?: number;
}

interface Preview {
  wouldAdd: number;
  wouldRemove: number;
  sampleAdd: string[];
  sampleRemove: string[];
}

interface RunResult {
  ruleId: string;
  name: string;
  added: number;
  removed: number;
  failed: number;
  remaining: number;
}

type RuleForm = {
  key: string;
  name: string;
  description: string;
  category: string;
  delay_days: number;
  flodesk_segment_id: string;
  remove_on_exit: boolean;
  is_enabled: boolean;
};

const EMPTY_FORM: RuleForm = {
  key: "",
  name: "",
  description: "",
  category: "Waitlist",
  delay_days: 0,
  flodesk_segment_id: "",
  remove_on_exit: true,
  is_enabled: false,
};

const CATEGORY_HELP: Record<string, string> = {
  Waitlist: "membership_level = waitlist. Delay counts from waitlist_joined_at.",
  Abandoned: "Free, profile completed, never chose a tier and not approved. Delay counts from joined_at.",
  "Profile Incomplete": "Free, profile not completed. Delay counts from joined_at.",
  Free: "Approved free members.",
  Contributing: "Paid contributing members.",
  Founding: "Paid founding members.",
  "Newsletter Only":
    "Emails in coming_soon_emails that have no matching profiles.email. Exits automatically when the email becomes a profile.",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminFlodeskClient() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentsError, setSegmentsError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [editing, setEditing] = useState<Rule | "new" | null>(null);
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [previewFor, setPreviewFor] = useState<Rule | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [busyRule, setBusyRule] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [lastRun, setLastRun] = useState<RunResult[] | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "clear" | "delete"; rule: Rule } | null>(null);

  // ---- data loading -------------------------------------------------------

  const fetchRules = useCallback(async () => {
    const res = await fetch("/api/admin/flodesk/rules");
    if (!res.ok) throw new Error("Failed to load rules");
    const data = await res.json();
    setRules(data.rules || []);
    setCategories(data.categories || []);
  }, []);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/admin/flodesk/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  const fetchSegments = useCallback(async () => {
    const res = await fetch("/api/admin/flodesk/segments");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSegments(data.segments || []);
      setSegmentsError(null);
    } else {
      setSegments([]);
      setSegmentsError(data.error || "Failed to load segments");
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([fetchRules(), fetchStatus(), fetchSegments()]);
      } catch (err) {
        setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to load" });
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchRules, fetchStatus, fetchSegments]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchRules(), fetchStatus()]);
  }, [fetchRules, fetchStatus]);

  // ---- rule editing -------------------------------------------------------

  const openNew = () => {
    setForm({ ...EMPTY_FORM, category: categories[0] || "Waitlist" });
    setEditing("new");
  };

  const openEdit = (rule: Rule) => {
    setForm({
      key: rule.key,
      name: rule.name,
      description: rule.description || "",
      category: rule.category,
      delay_days: rule.delay_days,
      flodesk_segment_id: rule.flodesk_segment_id || "",
      remove_on_exit: rule.remove_on_exit,
      is_enabled: rule.is_enabled,
    });
    setEditing(rule);
  };

  const saveRule = async () => {
    if (!editing) return;
    setSaving(true);
    setMessage(null);
    try {
      const segment = segments.find((s) => s.id === form.flodesk_segment_id);
      const payload = {
        ...form,
        description: form.description || null,
        flodesk_segment_id: form.flodesk_segment_id || null,
        flodesk_segment_name: segment?.name ?? (form.flodesk_segment_id ? (editing !== "new" ? editing.flodesk_segment_name : null) : null),
      };
      const res =
        editing === "new"
          ? await fetch("/api/admin/flodesk/rules", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/admin/flodesk/rules/${editing.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      setEditing(null);
      setMessage({ type: "success", text: editing === "new" ? "Rule created" : "Rule saved" });
      await fetchRules();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (rule: Rule) => {
    setBusyRule(rule.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/flodesk/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !rule.is_enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");
      await fetchRules();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setBusyRule(null);
    }
  };

  const deleteRule = async (rule: Rule) => {
    setBusyRule(rule.id);
    try {
      const res = await fetch(`/api/admin/flodesk/rules/${rule.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setMessage({ type: "success", text: `Deleted rule "${rule.name}"` });
      await fetchRules();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Delete failed" });
    } finally {
      setBusyRule(null);
      setConfirmAction(null);
    }
  };

  // ---- preview / run ------------------------------------------------------

  const openPreview = async (rule: Rule) => {
    setPreviewFor(rule);
    setPreview(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/flodesk/rules/${rule.id}/preview`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setPreview(data);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Preview failed" });
      setPreviewFor(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const runSync = async (rule?: Rule) => {
    if (rule) setBusyRule(rule.id);
    else setRunningAll(true);
    setMessage(null);
    setLastRun(null);
    try {
      const res = await fetch("/api/admin/flodesk/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId: rule?.id, action: "sync" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Run failed");
      if (data.skipped === "no_rules") {
        setMessage({ type: "error", text: "No enabled rules with a segment assigned" });
      } else {
        setLastRun(data.rules || []);
        const t = (data.rules || []).reduce(
          (a: RunResult, r: RunResult) => ({
            ...a,
            added: a.added + r.added,
            removed: a.removed + r.removed,
            failed: a.failed + r.failed,
            remaining: a.remaining + r.remaining,
          }),
          { ruleId: "", name: "", added: 0, removed: 0, failed: 0, remaining: 0 },
        );
        setMessage({
          type: t.failed > 0 ? "error" : "success",
          text: `Added ${t.added}, removed ${t.removed}, failed ${t.failed}${t.remaining ? `, ${t.remaining} remaining (run again)` : ""}${data.rateLimited ? " — Flodesk rate limit hit" : ""}`,
        });
      }
      await refreshAll();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Run failed" });
    } finally {
      setBusyRule(null);
      setRunningAll(false);
    }
  };

  const clearSegment = async (rule: Rule) => {
    setBusyRule(rule.id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/flodesk/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId: rule.id, action: "clear" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Clear failed");
      setMessage({
        type: data.failed > 0 ? "error" : "success",
        text: `Removed ${data.removed} from "${rule.flodesk_segment_name || rule.name}"${data.failed ? `, ${data.failed} failed` : ""}${data.remaining ? `, ${data.remaining} remaining (run again)` : ""}`,
      });
      await refreshAll();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Clear failed" });
    } finally {
      setBusyRule(null);
      setConfirmAction(null);
    }
  };

  // ---- render -------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-nfw-blackberry/60">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  const connectionOk = status?.connection.ok ?? false;

  return (
    <div className="space-y-6">
      {/* Connection */}
      <div className="bg-white p-5 border border-nfw-blackberry/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {status?.configured ? (
              connectionOk ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            <div>
              <div className="font-ui font-bold text-sm uppercase tracking-wide text-nfw-blackberry">
                {!status?.configured
                  ? "Flodesk not configured"
                  : connectionOk
                    ? "Connected to Flodesk"
                    : "Flodesk connection failed"}
              </div>
              <div className="text-sm text-nfw-blackberry/60">
                {!status?.configured
                  ? "Set FLODESK_API_KEY in Vercel environment variables (Flodesk → Account → Integrations → API)."
                  : connectionOk
                    ? `${status?.connection.segmentCount ?? 0} segments in account`
                    : status?.connection.error}
                {status?.configured && typeof status?.newsletterSignupCount === "number" && (
                  <span className="block mt-1">
                    {status.newsletterSignupCount.toLocaleString("en-US")} newsletter signup{status.newsletterSignupCount === 1 ? "" : "s"} on file (eligible = those not matching any profile)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setLoading(true);
                Promise.all([fetchRules(), fetchStatus(), fetchSegments()]).finally(() => setLoading(false));
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-ui font-bold uppercase tracking-wide border border-nfw-blackberry/20 text-nfw-blackberry hover:bg-nfw-dove"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              onClick={() => runSync()}
              disabled={!connectionOk || runningAll}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-ui font-bold uppercase tracking-wide bg-nfw-aubergine text-white hover:bg-nfw-aubergine/90 disabled:opacity-50"
            >
              {runningAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {runningAll ? "Running…" : "Run all enabled now"}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 text-sm border ${
            message.type === "success"
              ? "bg-nfw-wisteria/20 border-nfw-wisteria text-nfw-blackberry"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Rules */}
      <div className="bg-white border border-nfw-blackberry/10">
        <div className="flex items-center justify-between p-5 border-b border-nfw-blackberry/10">
          <h2 className="text-xl font-serif text-nfw-blackberry">Rules</h2>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-ui font-bold uppercase tracking-wide bg-nfw-lilac text-white hover:bg-nfw-lilac/90"
          >
            <Plus className="w-3.5 h-3.5" /> New rule
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="p-8 text-center text-nfw-blackberry/50">No rules yet.</div>
        ) : (
          <div className="divide-y divide-nfw-blackberry/10">
            {rules.map((rule) => {
              const busy = busyRule === rule.id;
              return (
                <div key={rule.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-lg text-nfw-blackberry">{rule.name}</span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-ui font-black uppercase tracking-wider ${
                          rule.is_enabled ? "bg-green-100 text-green-700" : "bg-nfw-stone/40 text-nfw-blackberry/60"
                        }`}
                      >
                        {rule.is_enabled ? "Enabled" : "Disabled"}
                      </span>
                      {rule.counts.failed > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-ui font-black uppercase tracking-wider bg-red-100 text-red-700">
                          {rule.counts.failed} failed
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-nfw-blackberry/70">
                      <span className="font-ui font-bold">{rule.category}</span>
                      {rule.category === "Newsletter Only" && (
                        <span className="ml-2 px-2 py-0.5 text-[10px] font-ui font-black uppercase tracking-wider bg-nfw-lilac text-white">
                          Newsletter
                        </span>
                      )}
                      {" · "}
                      {rule.delay_days === 0 ? "immediately" : `after ${rule.delay_days} day${rule.delay_days === 1 ? "" : "s"}`}
                      {" → "}
                      {rule.flodesk_segment_id ? (
                        <span className="font-ui">{rule.flodesk_segment_name || rule.flodesk_segment_id}</span>
                      ) : (
                        <span className="text-amber-700 font-ui">no segment assigned</span>
                      )}
                      {!rule.remove_on_exit && <span className="text-nfw-blackberry/50"> · no removal on exit</span>}
                    </div>
                    {rule.description && <div className="mt-1 text-xs text-nfw-blackberry/50">{rule.description}</div>}
                    <div className="mt-2 flex flex-wrap gap-4 text-xs font-ui text-nfw-blackberry/60">
                      <span>
                        In segment: <strong className="text-nfw-blackberry">{rule.counts.added}</strong>
                      </span>
                      <span>Removed: {rule.counts.removed}</span>
                      <span>Last run: {formatDateTime(rule.last_run_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => toggleEnabled(rule)}
                      disabled={busy || (!rule.is_enabled && !rule.flodesk_segment_id)}
                      title={!rule.flodesk_segment_id ? "Assign a segment first" : rule.is_enabled ? "Disable" : "Enable"}
                      className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-40 ${
                        rule.is_enabled ? "bg-nfw-wisteria" : "bg-nfw-stone/60"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          rule.is_enabled ? "translate-x-5" : ""
                        }`}
                      />
                    </button>
                    <ActionButton onClick={() => openPreview(rule)} disabled={busy || !rule.flodesk_segment_id} title="Preview">
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </ActionButton>
                    <ActionButton onClick={() => runSync(rule)} disabled={busy || !connectionOk || !rule.flodesk_segment_id} title="Run now">
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Run
                    </ActionButton>
                    <ActionButton onClick={() => openEdit(rule)} disabled={busy} title="Edit">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </ActionButton>
                    <ActionButton
                      onClick={() => setConfirmAction({ type: "clear", rule })}
                      disabled={busy || !connectionOk || rule.counts.added === 0}
                      title="Remove everyone this rule added from the segment"
                    >
                      <X className="w-3.5 h-3.5" /> Clear
                    </ActionButton>
                    <ActionButton onClick={() => setConfirmAction({ type: "delete", rule })} disabled={busy} title="Delete rule" danger>
                      <Trash2 className="w-3.5 h-3.5" />
                    </ActionButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Last run */}
      {lastRun && lastRun.length > 0 && (
        <div className="bg-white border border-nfw-blackberry/10 p-5">
          <h3 className="font-ui font-bold text-xs uppercase tracking-wide text-nfw-blackberry/60 mb-3">Last run</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-ui uppercase tracking-wide text-nfw-blackberry/50">
                <th className="py-1">Rule</th>
                <th className="py-1 text-right">Added</th>
                <th className="py-1 text-right">Removed</th>
                <th className="py-1 text-right">Failed</th>
                <th className="py-1 text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {lastRun.map((r) => (
                <tr key={r.ruleId} className="border-t border-nfw-blackberry/10">
                  <td className="py-1.5 font-serif">{r.name}</td>
                  <td className="py-1.5 text-right font-ui">{r.added}</td>
                  <td className="py-1.5 text-right font-ui">{r.removed}</td>
                  <td className={`py-1.5 text-right font-ui ${r.failed ? "text-red-700" : ""}`}>{r.failed}</td>
                  <td className="py-1.5 text-right font-ui">{r.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Failures */}
      {status && status.recentFailures.length > 0 && (
        <div className="bg-white border border-nfw-blackberry/10 p-5">
          <h3 className="font-ui font-bold text-xs uppercase tracking-wide text-nfw-blackberry/60 mb-3">
            Recent failures ({status.recentFailures.length})
          </h3>
          <p className="text-xs text-nfw-blackberry/50 mb-3">
            Failed members are retried on each run up to 5 attempts.
          </p>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-ui uppercase tracking-wide text-nfw-blackberry/50">
                  <th className="py-1">Rule</th>
                  <th className="py-1">Member</th>
                  <th className="py-1">Error</th>
                  <th className="py-1 text-right">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {status.recentFailures.map((f) => (
                  <tr key={`${f.ruleId}:${f.type === "email" ? f.email : f.profileId}`} className="border-t border-nfw-blackberry/10">
                    <td className="py-1.5 font-serif whitespace-nowrap">{f.ruleName}</td>
                    <td className="py-1.5">
                      <div className="font-serif">
                        {f.type === "email" ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-ui font-black uppercase tracking-wider bg-nfw-stone/40 text-nfw-blackberry/70 mr-2 align-middle">
                            email-only
                          </span>
                        ) : (
                          (f.fullName || "—")
                        )}
                      </div>
                      <div className="text-xs text-nfw-blackberry/60 font-ui">{f.email || "—"}</div>
                    </td>
                    <td className="py-1.5 text-xs text-red-700 font-mono break-all">{f.lastError}</td>
                    <td className="py-1.5 text-right font-ui">{f.attemptCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / create modal */}
      {editing && (
        <Modal title={editing === "new" ? "New rule" : `Edit "${editing.name}"`} onClose={() => !saving && setEditing(null)}>
          <div className="space-y-4">
            <Field label="Name">
              <input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    key: editing === "new" ? name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") : f.key,
                  }));
                }}
                className="w-full border border-nfw-blackberry/20 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Key" hint="Stable identifier, lowercase.">
              <input
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                className="w-full border border-nfw-blackberry/20 px-3 py-2 text-sm font-mono"
              />
            </Field>
            <Field label="Category" hint={CATEGORY_HELP[form.category]}>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-nfw-blackberry/20 px-3 py-2 text-sm bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Delay (days)" hint="How long a member must be in the category before being added. 0 = next hourly run.">
              <input
                type="number"
                min={0}
                max={3650}
                value={form.delay_days}
                onChange={(e) => setForm((f) => ({ ...f, delay_days: Math.max(0, parseInt(e.target.value || "0", 10)) }))}
                className="w-32 border border-nfw-blackberry/20 px-3 py-2 text-sm"
              />
            </Field>
            <Field
              label="Flodesk segment"
              hint={segmentsError ? segmentsError : "Create the segment in Flodesk first, then pick it here."}
            >
              <select
                value={form.flodesk_segment_id}
                onChange={(e) => setForm((f) => ({ ...f, flodesk_segment_id: e.target.value }))}
                className="w-full border border-nfw-blackberry/20 px-3 py-2 text-sm bg-white"
                disabled={segments.length === 0}
              >
                <option value="">— none —</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.total_active_subscribers != null ? ` (${s.total_active_subscribers})` : ""}
                  </option>
                ))}
                {form.flodesk_segment_id && !segments.some((s) => s.id === form.flodesk_segment_id) && (
                  <option value={form.flodesk_segment_id}>{form.flodesk_segment_id} (not in list)</option>
                )}
              </select>
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full border border-nfw-blackberry/20 px-3 py-2 text-sm"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.remove_on_exit}
                onChange={(e) => setForm((f) => ({ ...f, remove_on_exit: e.target.checked }))}
              />
              Remove from segment when the member leaves this category
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_enabled}
                disabled={!form.flodesk_segment_id}
                onChange={(e) => setForm((f) => ({ ...f, is_enabled: e.target.checked }))}
              />
              Enabled {!form.flodesk_segment_id && <span className="text-nfw-blackberry/50">(assign a segment first)</span>}
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              disabled={saving}
              className="px-4 py-2 text-xs font-ui font-bold uppercase tracking-wide border border-nfw-blackberry/20 hover:bg-nfw-dove"
            >
              Cancel
            </button>
            <button
              onClick={saveRule}
              disabled={saving || !form.name || !form.key}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-ui font-bold uppercase tracking-wide bg-nfw-aubergine text-white hover:bg-nfw-aubergine/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {/* Preview modal */}
      {previewFor && (
        <Modal title={`Preview: ${previewFor.name}`} onClose={() => setPreviewFor(null)}>
          {previewLoading || !preview ? (
            <div className="flex items-center gap-2 text-nfw-blackberry/60">
              <Loader2 className="w-4 h-4 animate-spin" /> Evaluating all profiles…
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <p className="text-nfw-blackberry/70">
                What the next run would do for this rule. Nothing has been sent to Flodesk.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-nfw-wisteria/20 p-4">
                  <div className="text-3xl font-serif text-nfw-blackberry">{preview.wouldAdd}</div>
                  <div className="text-xs font-ui uppercase tracking-wide text-nfw-blackberry/60">would be added</div>
                </div>
                <div className="bg-nfw-stone/30 p-4">
                  <div className="text-3xl font-serif text-nfw-blackberry">{preview.wouldRemove}</div>
                  <div className="text-xs font-ui uppercase tracking-wide text-nfw-blackberry/60">would be removed</div>
                </div>
              </div>
              {preview.sampleAdd.length > 0 && (
                <div>
                  <div className="text-xs font-ui uppercase tracking-wide text-nfw-blackberry/50 mb-1">Sample to add</div>
                  <ul className="font-mono text-xs space-y-0.5">
                    {preview.sampleAdd.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {preview.sampleRemove.length > 0 && (
                <div>
                  <div className="text-xs font-ui uppercase tracking-wide text-nfw-blackberry/50 mb-1">Sample to remove</div>
                  <ul className="font-mono text-xs space-y-0.5">
                    {preview.sampleRemove.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Confirm modal */}
      {confirmAction && (
        <Modal
          title={confirmAction.type === "clear" ? "Clear segment?" : "Delete rule?"}
          onClose={() => busyRule !== confirmAction.rule.id && setConfirmAction(null)}
        >
          <p className="text-sm text-nfw-blackberry/80">
            {confirmAction.type === "clear" ? (
              <>
                Remove all <strong>{confirmAction.rule.counts.added}</strong> members this rule added from the Flodesk
                segment <strong>{confirmAction.rule.flodesk_segment_name || confirmAction.rule.flodesk_segment_id}</strong>.
                If the rule stays enabled, eligible members will be re-added on the next run.
              </>
            ) : (
              <>
                Delete the rule <strong>{confirmAction.rule.name}</strong> and its sync history. Members already in the
                Flodesk segment will <strong>not</strong> be removed — use Clear first if you want that.
              </>
            )}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setConfirmAction(null)}
              disabled={busyRule === confirmAction.rule.id}
              className="px-4 py-2 text-xs font-ui font-bold uppercase tracking-wide border border-nfw-blackberry/20 hover:bg-nfw-dove"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                confirmAction.type === "clear" ? clearSegment(confirmAction.rule) : deleteRule(confirmAction.rule)
              }
              disabled={busyRule === confirmAction.rule.id}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-ui font-bold uppercase tracking-wide bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busyRule === confirmAction.rule.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {confirmAction.type === "clear" ? "Clear segment" : "Delete rule"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function ActionButton({
  children,
  onClick,
  disabled,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-ui font-bold uppercase tracking-wide border disabled:opacity-40 ${
        danger
          ? "border-red-200 text-red-700 hover:bg-red-50"
          : "border-nfw-blackberry/20 text-nfw-blackberry hover:bg-nfw-dove"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-ui font-bold uppercase tracking-wide text-nfw-blackberry/70 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-nfw-blackberry/50">{hint}</p>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-nfw-blackberry/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-serif text-nfw-blackberry">{title}</h3>
          <button onClick={onClose} className="p-1 text-nfw-blackberry/50 hover:text-nfw-blackberry">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
