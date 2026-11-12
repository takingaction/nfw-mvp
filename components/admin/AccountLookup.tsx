"use client";

import { useState } from "react";
import { SITE_TZ, SITE_TZ_LABEL } from "@/lib/dates";

type Account = {
  id: string;
  email: string;
  created_at: string;
  confirmation_sent_at: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  recovery_sent_at: string | null;
  providers: string[];
  has_password: boolean;
  has_profile: boolean;
  profile_completed: boolean | null;
  membership_level: string | null;
  full_name: string | null;
};

type LookupResult = {
  account: Account | null;
  status: string;
  summary: string;
  tellThem: string;
};

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  not_found: { label: "No account", className: "bg-gray-100 text-gray-700" },
  banned: { label: "Blocked", className: "bg-red-100 text-red-700" },
  unconfirmed: { label: "Email not confirmed", className: "bg-nfw-citrine/60 text-nfw-blackberry" },
  confirmed_no_profile: { label: "Stuck before step 1", className: "bg-nfw-citrine/60 text-nfw-blackberry" },
  profile_incomplete: { label: "Signup incomplete", className: "bg-nfw-lilac/30 text-nfw-aubergine" },
  complete: { label: "Member", className: "bg-green-100 text-green-700" },
};

function fmt(value: string | null | undefined) {
  if (!value) return "—";
  return (
    new Date(value).toLocaleString("en-US", {
      timeZone: SITE_TZ,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) + ` ${SITE_TZ_LABEL}`
  );
}

/**
 * Support lookup by email. Reads auth accounts too, so people who confirmed
 * their email but never got a profile (and so aren't in the members list) show up.
 */
export default function AccountLookup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [copied, setCopied] = useState(false);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/admin/members/lookup?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.tellThem);
      setCopied(true);
    } catch {}
  };

  const style = result ? STATUS_STYLE[result.status] ?? STATUS_STYLE.not_found : null;
  const a = result?.account;

  return (
    <section className="bg-white border border-nfw-blackberry/10 p-6 mb-8">
      <h2 className="text-lg font-bold text-nfw-blackberry mb-1">Look up an account by email</h2>
      <p className="text-sm text-nfw-blackberry/60 mb-4">
        Finds everyone who has signed up, including people who aren&apos;t in the members list yet.
      </p>
      <form onSubmit={lookup} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="member@example.com"
          aria-label="Email address"
          className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm text-nfw-blackberry focus:outline-none focus:ring-2 focus:ring-nfw-lilac"
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="px-5 py-2 bg-nfw-blackberry text-white font-bold text-sm hover:bg-nfw-blackberry/90 disabled:opacity-50"
        >
          {loading ? "Looking up…" : "Look up"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && style && (
        <div className="mt-5 border-t border-nfw-blackberry/10 pt-5">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${style.className}`}>
              {style.label}
            </span>
            {a && (
              <span className="text-sm text-nfw-blackberry">
                {a.full_name || a.email}
              </span>
            )}
          </div>
          <p className="text-sm text-nfw-blackberry/80 mb-4">{result.summary}</p>

          <div className="bg-nfw-dove p-4 mb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-nfw-blackberry/60 mb-1">
                  What to tell them
                </div>
                <p className="text-sm text-nfw-blackberry">{result.tellThem}</p>
              </div>
              <button
                type="button"
                onClick={copy}
                className="shrink-0 text-xs font-semibold text-nfw-aubergine underline"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {a && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ["Signed up", fmt(a.created_at)],
                ["Email confirmed", fmt(a.email_confirmed_at)],
                ["Last sign-in", fmt(a.last_sign_in_at)],
                ["Last password reset email", fmt(a.recovery_sent_at)],
                ["Signs in with", [a.has_password ? "password" : null, a.providers.includes("google") ? "Google" : null].filter(Boolean).join(" + ") || "—"],
                ["Profile", a.has_profile ? (a.profile_completed ? "complete" : "started, not finished") : "none yet"],
                ["Membership", a.membership_level || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-nfw-blackberry/5 py-1">
                  <dt className="text-nfw-blackberry/60">{label}</dt>
                  <dd className="text-nfw-blackberry text-right">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </section>
  );
}
