"use client";

import { useCallback, useEffect, useState } from "react";
import { SITE_TZ } from "@/lib/dates";

type StuckSignup = {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string;
  last_sign_in_at: string | null;
  providers: string[];
  last_reminder_at: string | null;
};

type Stats = { total: number; reminded: number; eligible: number; tooRecent: number };

const fmtDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", { timeZone: SITE_TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    : "—";

function signsInWith(providers: string[]) {
  const parts = [providers.includes("email") ? "Password" : null, providers.includes("google") ? "Google" : null].filter(Boolean);
  return parts.join(" + ") || "—";
}

function downloadCsv(rows: StuckSignup[]) {
  const header = ["email", "signed_up", "email_confirmed", "signs_in_with", "reminder_sent"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.email, r.created_at, r.email_confirmed_at, signsInWith(r.providers), r.last_reminder_at ?? ""].map(esc).join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `stuck-signups-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * People who confirmed their email but never reached signup step 1, so they
 * have no profile and don't appear in the list below or in the members list.
 */
export default function StuckSignupsPanel() {
  const [rows, setRows] = useState<StuckSignup[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; failed: number; target: number } | null>(null);
  const [sendMessage, setSendMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [showList, setShowList] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bulk/stuck-signups");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(data.signups || []);
      setStats(data.stats);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendAll = async () => {
    if (!stats || stats.eligible === 0) return;
    if (
      !confirm(
        `Send the "finish signing up" email to ${stats.eligible} people who confirmed their email but never finished signing up?\n\nEach person gets it once. People who signed up in the last 24 hours are skipped.`,
      )
    ) {
      return;
    }

    setSending(true);
    setSendMessage(null);
    const totals = { sent: 0, failed: 0, target: stats.eligible };
    setProgress({ ...totals });

    try {
      // Each request sends one batch and reports how many are left.
      for (;;) {
        const res = await fetch("/api/admin/bulk/stuck-signups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to send");
        totals.sent += data.sent;
        totals.failed += data.failed;
        setProgress({ ...totals });
        // Stop on failures (they stay eligible and would repeat) or when done.
        if (data.failed > 0 || data.remaining === 0 || data.sent === 0) {
          if (data.failed > 0) {
            const first = data.errors?.[0];
            throw new Error(
              `Stopped after ${totals.sent} sent, ${totals.failed} failed${first ? ` (${first.email}: ${first.error})` : ""}.`,
            );
          }
          break;
        }
      }
      setSendMessage({ ok: true, text: `Sent ${totals.sent} reminder emails.` });
    } catch (err) {
      setSendMessage({ ok: false, text: err instanceof Error ? err.message : "Failed to send" });
    } finally {
      setSending(false);
      await load();
    }
  };

  const sendOne = async (id: string) => {
    setSendMessage(null);
    try {
      const res = await fetch("/api/admin/bulk/stuck-signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || data.failed > 0) throw new Error(data.error || data.errors?.[0]?.error || "Failed to send");
      await load();
    } catch (err) {
      setSendMessage({ ok: false, text: err instanceof Error ? err.message : "Failed to send" });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 mb-8 border border-nfw-aubergine/20 text-sm font-ui text-nfw-aubergine">
        Loading stuck signups…
      </div>
    );
  }

  if (loadError || !stats) {
    return (
      <div className="bg-white rounded-lg p-6 mb-8 border border-red-200 text-sm font-ui text-red-700">
        Stuck signups: {loadError || "Failed to load"}
      </div>
    );
  }

  return (
    <section className="bg-white rounded-lg p-6 mb-10 border border-nfw-aubergine/20">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-serif text-nfw-blackberry">Confirmed, but never started their profile</h2>
          <p className="text-sm font-ui text-nfw-aubergine/70 mt-1 max-w-2xl">
            These people confirmed their email but never reached signup step 1, so they aren&apos;t in the list
            below or in Members. They can log in with their password or Google and pick up where they left off. The
            reminder email takes them there.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => downloadCsv(rows)}
            disabled={rows.length === 0}
            className="px-4 py-2 border border-nfw-aubergine/30 text-nfw-aubergine font-ui text-sm rounded-lg hover:bg-nfw-aubergine/5 disabled:opacity-50"
          >
            Download CSV
          </button>
          <button
            onClick={sendAll}
            disabled={sending || stats.eligible === 0}
            className="px-4 py-2 bg-nfw-aubergine text-white font-ui text-sm rounded-lg hover:bg-nfw-aubergine/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending…" : `Send reminder to ${stats.eligible}`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          ["Stuck", stats.total],
          ["Ready to remind", stats.eligible],
          ["Already reminded", stats.reminded],
          ["Signed up < 24h ago", stats.tooRecent],
        ].map(([label, value]) => (
          <div key={label as string} className="bg-nfw-dove rounded-lg p-4">
            <div className="text-2xl font-serif text-nfw-aubergine">{value}</div>
            <div className="text-xs font-ui text-nfw-aubergine/70 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {progress && sending && (
        <div className="mb-4">
          <div className="text-sm font-ui text-nfw-blackberry mb-2">
            Sent {progress.sent} of {progress.target}
            {progress.failed > 0 ? `, ${progress.failed} failed` : ""}
          </div>
          <div className="w-full bg-nfw-dove rounded-full h-2">
            <div
              className="bg-nfw-aubergine h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.target ? Math.min(100, (progress.sent / progress.target) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {sendMessage && (
        <div
          className={`rounded-lg p-3 mb-4 text-sm font-ui ${
            sendMessage.ok ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {sendMessage.text}
        </div>
      )}

      {rows.length > 0 && (
        <button
          onClick={() => setShowList((v) => !v)}
          className="text-sm font-ui text-nfw-aubergine underline"
        >
          {showList ? "Hide list" : `Show all ${rows.length}`}
        </button>
      )}

      {showList && (
        <div className="mt-4 overflow-x-auto border border-nfw-aubergine/10 rounded-lg">
          <table className="w-full text-sm font-ui">
            <thead>
              <tr className="bg-nfw-aubergine/10 text-left text-nfw-blackberry">
                <th className="px-4 py-2 font-semibold">Email</th>
                <th className="px-4 py-2 font-semibold">Signed up</th>
                <th className="px-4 py-2 font-semibold">Signs in with</th>
                <th className="px-4 py-2 font-semibold">Reminder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const recent = Date.now() - new Date(r.created_at).getTime() < 24 * 60 * 60 * 1000;
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-nfw-aubergine break-all">{r.email}</td>
                    <td className="px-4 py-2 text-nfw-aubergine whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-2 text-nfw-aubergine whitespace-nowrap">{signsInWith(r.providers)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {r.last_reminder_at ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          Sent {fmtDate(r.last_reminder_at)}
                        </span>
                      ) : recent ? (
                        <span className="text-xs text-nfw-aubergine/60">Under 24h old</span>
                      ) : (
                        <button
                          onClick={() => sendOne(r.id)}
                          disabled={sending}
                          className="text-sm text-nfw-aubergine underline disabled:opacity-50"
                        >
                          Send reminder
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
