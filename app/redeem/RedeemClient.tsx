"use client";

import { useState } from "react";
import Link from "next/link";
import { Gift, Loader2, Check, AlertCircle } from "lucide-react";

export type RedeemView =
  | { kind: "enter" }
  | { kind: "error"; code: string; message: string }
  | { kind: "logged_out"; code: string; gift: string; expiresAt: string | null; signUpHref: string; loginHref: string }
  | { kind: "already_member"; code: string; gift: string }
  | { kind: "ready"; code: string; displayCode: string; gift: string; expiresAt: string | null; email: string };

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[calc(100svh-4rem)] bg-nfw-dove flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-nfw-blackberry/10 p-8 space-y-6 text-center">
        {children}
      </div>
    </main>
  );
}

function GiftHeader({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="w-14 h-14 mx-auto bg-nfw-lilac/30 rounded-full flex items-center justify-center">
        <Gift className="w-7 h-7 text-nfw-aubergine" />
      </div>
      <h1 className="text-2xl font-black text-nfw-blackberry font-serif">{title}</h1>
      {sub && <p className="text-nfw-blackberry/70 text-sm">{sub}</p>}
    </div>
  );
}

const CodeChip = ({ code }: { code: string }) => (
  <p className="inline-block font-mono font-semibold tracking-widest text-nfw-aubergine bg-nfw-lilac/15 px-4 py-2">{code}</p>
);

const primaryBtn =
  "w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-nfw-blackberry text-white font-semibold text-sm hover:bg-nfw-blackberry/90 transition-colors disabled:opacity-50";
const secondaryBtn =
  "w-full inline-flex items-center justify-center px-5 py-3 border-2 border-nfw-blackberry text-nfw-blackberry font-semibold text-sm hover:bg-nfw-blackberry/5 transition-colors";

export default function RedeemClient({ view }: { view: RedeemView }) {
  const [entered, setEntered] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (view.kind === "enter") {
    return (
      <Shell>
        <GiftHeader title="Redeem your gift" sub="Enter the code printed on your card." />
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const clean = entered.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
            // Full navigation, so the proxy moves the code out of the address before the page loads.
            if (clean) window.location.assign(`/redeem?code=${clean}`);
          }}
        >
          <input
            value={entered}
            onChange={(e) => setEntered(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full px-4 py-3 border border-nfw-blackberry/20 text-center font-mono text-lg tracking-widest uppercase text-nfw-blackberry focus:outline-none focus:ring-2 focus:ring-nfw-lilac"
          />
          <button type="submit" disabled={!entered.trim()} className={primaryBtn}>
            Continue
          </button>
        </form>
      </Shell>
    );
  }

  if (view.kind === "error") {
    return (
      <Shell>
        <div className="w-14 h-14 mx-auto bg-red-50 rounded-full flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-2xl font-black text-nfw-blackberry font-serif">We couldn&apos;t use this code</h1>
        {view.code && <CodeChip code={view.code} />}
        <p className="text-nfw-blackberry/70 text-sm">{view.message}</p>
        <div className="space-y-2">
          <Link href="/redeem" className={primaryBtn}>Try another code</Link>
          <Link href="/contact" className="block text-sm text-nfw-blackberry/60 underline">Need help? Contact us</Link>
        </div>
      </Shell>
    );
  }

  if (view.kind === "already_member") {
    return (
      <Shell>
        <GiftHeader title="You're already a member" />
        <CodeChip code={view.code} />
        <p className="text-nfw-blackberry/70 text-sm">
          You already have an active paid membership, so we didn&apos;t use this code. It&apos;s still good for{" "}
          {view.gift} — pass the card on to a friend who&apos;d love to join.
        </p>
        <Link href="/dashboard" className={primaryBtn}>Go to my dashboard</Link>
      </Shell>
    );
  }

  if (view.kind === "logged_out") {
    return (
      <Shell>
        <GiftHeader title="You've been gifted a membership" sub={<>Your gift: <strong>{view.gift}</strong></>} />
        <CodeChip code={view.code} />
        {view.expiresAt && <p className="text-xs text-nfw-blackberry/50">Redeem by {fmtDate(view.expiresAt)}</p>}
        <div className="space-y-3">
          <Link href={view.signUpHref} className={primaryBtn}>Create my account</Link>
          <Link href={view.loginHref} className={secondaryBtn}>I already have an account</Link>
        </div>
        <p className="text-xs text-nfw-blackberry/50">No credit card needed. We&apos;ll keep your code while you sign up.</p>
      </Shell>
    );
  }

  // ready
  const redeem = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/gift-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: view.code }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to redeem code");
      setDone(true);
      window.location.href = "/auth/welcome";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <GiftHeader title="Your gift is ready" sub={<>Your gift: <strong>{view.gift}</strong></>} />
      <CodeChip code={view.displayCode} />
      <p className="text-xs text-nfw-blackberry/50">
        Redeeming as {view.email}.{" "}
Not you?{" "}
        <Link href="/auth/logout" prefetch={false} className="underline">Log out</Link>, then scan the card again.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={redeem} disabled={submitting || done} className={primaryBtn}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : null}
        {done ? "Activated" : "Activate my membership"}
      </button>
    </Shell>
  );
}
