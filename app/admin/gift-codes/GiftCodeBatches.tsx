"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Plus, Printer, X, Loader2, Ban, Filter } from "lucide-react";

import { SITE_TZ, siteToday } from "@/lib/dates";
export interface GiftCodeBatch {
  id: string;
  name: string;
  tier: "contributing" | "founding";
  quantity: number;
  membership_months: number;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  issued: number;
  redeemed: number;
  voided: number;
  expired: number;
  available: number;
  last_redeemed_at: string | null;
}

interface Props {
  /** Called after a batch is created or voided so the code list can refresh. */
  onChanged: () => void;
  /** Filter the code list to one batch. */
  onSelectBatch: (batchId: string) => void;
  /** Lets the parent populate its batch filter dropdown. */
  onBatchesLoaded?: (batches: GiftCodeBatch[]) => void;
}

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: SITE_TZ })
    : "—";

async function downloadCsv(url: string, fallbackName: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Download failed");
  }
  const disposition = res.headers.get("Content-Disposition") || "";
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] || fallbackName;
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export default function GiftCodeBatches({ onChanged, onSelectBatch, onBatchesLoaded }: Props) {
  const [batches, setBatches] = useState<GiftCodeBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gift-codes/batches");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load batches");
      setBatches(data.batches);
      onBatchesLoaded?.(data.batches);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [onBatchesLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async (batch: GiftCodeBatch, scope: "available" | "all") => {
    setBusyId(batch.id);
    setError(null);
    try {
      await downloadCsv(`/api/admin/gift-codes/batches/${batch.id}/csv?scope=${scope}`, `${batch.name}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleVoidBatch = async (batch: GiftCodeBatch) => {
    if (batch.available + batch.expired === 0) return;
    const reason = window.prompt(
      `Void all ${batch.available + batch.expired} unredeemed codes in "${batch.name}"?\n\nRedeemed codes are not affected. This can't be undone.\n\nReason (optional):`,
      "",
    );
    if (reason === null) return;
    setBusyId(batch.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/gift-codes/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: batch.id, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to void batch");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white border border-nfw-blackberry/10 rounded-xl overflow-hidden mb-8">
      <div className="p-4 border-b border-nfw-blackberry/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-nfw-lilac/20 rounded-full flex items-center justify-center">
            <Printer className="w-5 h-5 text-nfw-blackberry" />
          </div>
          <div>
            <h2 className="font-semibold text-nfw-aubergine">Print batches</h2>
            <p className="text-xs text-nfw-blackberry/60">
              Generate codes for mailed cards, download the printer CSV, and track redemptions per campaign.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-nfw-aubergine text-white font-semibold text-sm hover:bg-nfw-aubergine/90 transition-colors rounded-lg"
        >
          <Plus className="w-4 h-4" />
          New print batch
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-nfw-blackberry/5">
              {["Batch", "Grants", "Expires", "Issued", "Redeemed", "Available", "Voided / expired", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-nfw-blackberry/60 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-nfw-blackberry/10">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-nfw-blackberry/50 text-sm">Loading...</td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-nfw-blackberry/50 text-sm">
                  No print batches yet.
                </td>
              </tr>
            ) : (
              batches.map((b) => {
                const pct = b.issued ? Math.round((b.redeemed / b.issued) * 100) : 0;
                const busy = busyId === b.id;
                return (
                  <tr key={b.id} className="hover:bg-nfw-blackberry/5 align-top">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-nfw-blackberry">{b.name}</p>
                      <p className="text-xs text-nfw-blackberry/50">Created {fmtDate(b.created_at)}</p>
                      {b.notes && <p className="text-xs text-nfw-blackberry/50 mt-1 max-w-xs">{b.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-nfw-blackberry whitespace-nowrap">
                      {b.membership_months} mo {b.tier === "founding" ? "Founding" : "Contributing"}
                    </td>
                    <td className="px-4 py-3 text-sm text-nfw-blackberry/70 whitespace-nowrap">{fmtDate(b.expires_at)}</td>
                    <td className="px-4 py-3 text-sm text-nfw-blackberry">{b.issued.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-nfw-blackberry whitespace-nowrap">
                      {b.redeemed.toLocaleString()} <span className="text-nfw-blackberry/50">({pct}%)</span>
                      <div className="h-1.5 w-24 bg-nfw-blackberry/10 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full bg-nfw-wisteria" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-nfw-blackberry">{b.available.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-nfw-blackberry/70">
                      {b.voided.toLocaleString()} / {b.expired.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          onClick={() => handleDownload(b, "available")}
                          disabled={busy || b.available === 0}
                          title="Unredeemed, unvoided codes only — send this to the printer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-nfw-aubergine text-white rounded-lg hover:bg-nfw-aubergine/90 disabled:opacity-40"
                        >
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          Printer CSV
                        </button>
                        <button
                          onClick={() => handleDownload(b, "all")}
                          disabled={busy}
                          title="Every code with status and who redeemed it"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-nfw-blackberry/5 text-nfw-blackberry rounded-lg hover:bg-nfw-blackberry/10 disabled:opacity-40"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Full report
                        </button>
                        <button
                          onClick={() => onSelectBatch(b.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-nfw-blackberry/5 text-nfw-blackberry rounded-lg hover:bg-nfw-blackberry/10"
                        >
                          <Filter className="w-3.5 h-3.5" />
                          View codes
                        </button>
                        <button
                          onClick={() => handleVoidBatch(b)}
                          disabled={busy || b.available + b.expired === 0}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-40"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Void unredeemed
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateBatchModal
          onClose={() => setShowCreate(false)}
          onCreated={async (batch) => {
            setShowCreate(false);
            await load();
            onChanged();
            onSelectBatch(batch.id);
          }}
        />
      )}
    </div>
  );
}

function CreateBatchModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (batch: GiftCodeBatch) => void;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("500");
  const [tier, setTier] = useState<"contributing" | "founding">("contributing");
  const [months, setMonths] = useState("12");
  const [expiresOn, setExpiresOn] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qty = parseInt(quantity, 10) || 0;
  const today = siteToday();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gift-codes/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          quantity: qty,
          tier,
          membershipMonths: parseInt(months, 10),
          expiresOn: expiresOn || null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create batch");
      onCreated(data.batch);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  const input =
    "w-full px-3 py-2 border border-nfw-blackberry/20 text-nfw-blackberry text-sm focus:outline-none focus:ring-2 focus:ring-nfw-lilac rounded-lg bg-white";
  const label = "block text-xs font-semibold text-nfw-blackberry/70 mb-1";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-nfw-aubergine font-serif">New print batch</h3>
            <p className="text-xs text-nfw-blackberry/60">
              Each code is single-use. Order 5–10% extra to cover misprints; void leftovers later.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-nfw-blackberry/50" />
          </button>
        </div>

        <div>
          <label className={label} htmlFor="batch-name">Campaign name</label>
          <input id="batch-name" className={input} value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Holiday 2026 Mailer" required maxLength={120} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="batch-qty">Number of codes</label>
            <input id="batch-qty" type="number" min={1} max={20000} className={input} value={quantity}
              onChange={(e) => setQuantity(e.target.value)} required />
          </div>
          <div>
            <label className={label} htmlFor="batch-tier">Membership tier</label>
            <select id="batch-tier" className={input} value={tier} onChange={(e) => setTier(e.target.value as "contributing" | "founding")}>
              <option value="contributing">Contributing</option>
              <option value="founding">Founding</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="batch-months">Membership length (months)</label>
            <input id="batch-months" type="number" min={1} max={60} className={input} value={months}
              onChange={(e) => setMonths(e.target.value)} required />
          </div>
          <div>
            <label className={label} htmlFor="batch-expires">Code expires (optional)</label>
            <input id="batch-expires" type="date" min={today} className={input} value={expiresOn}
              onChange={(e) => setExpiresOn(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="batch-notes">Notes (printer, mail date, list source…)</label>
          <textarea id="batch-notes" rows={2} className={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-nfw-blackberry rounded-lg hover:bg-nfw-blackberry/5">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim() || qty < 1 || qty > 20000}
            className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-aubergine text-white font-semibold text-sm rounded-lg hover:bg-nfw-aubergine/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Generate {qty > 0 ? qty.toLocaleString() : ""} codes
          </button>
        </div>
      </form>
    </div>
  );
}
