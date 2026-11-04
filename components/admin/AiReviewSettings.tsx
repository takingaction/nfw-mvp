"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { AI_CUTOFF_OPTIONS, projectReviewer1, type AiRoutingStats } from "@/lib/grant-ai-settings";

/**
 * "AI review" settings for a scored grant cycle (grant edit page).
 * Values are kept as strings for the form; parseAiSettings() validates them.
 */

export interface AiReviewValues {
  ai_scoring_enabled: boolean;
  ai_score_cutoff: string; // "" = shadow mode
  ai_sample_rate: string; // percent
  reviewer2_cap: string; // "" = no cap
  reviewer2_discussion_slots: string;
}

export function aiReviewValuesFrom(data: Record<string, unknown>): AiReviewValues {
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? "" : String(Number(v)));
  return {
    ai_scoring_enabled: data.ai_scoring_enabled === true,
    ai_score_cutoff: num(data.ai_score_cutoff),
    ai_sample_rate: data.ai_sample_rate === null || data.ai_sample_rate === undefined ? "5" : String(Math.round(Number(data.ai_sample_rate) * 1000) / 10),
    reviewer2_cap: num(data.reviewer2_cap),
    reviewer2_discussion_slots: num(data.reviewer2_discussion_slots ?? 10) || "10",
  };
}

interface Props {
  cycleId: string;
  values: AiReviewValues;
  onChange: (v: AiReviewValues) => void;
  labelClass: string;
  inputClass: string;
}

const TABLE_CUTOFFS = AI_CUTOFF_OPTIONS.filter((c) => c >= 5);

export default function AiReviewSettings({ cycleId, values, onChange, labelClass, inputClass }: Props) {
  const [stats, setStats] = useState<AiRoutingStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (patch: Partial<AiReviewValues>) => onChange({ ...values, ...patch });

  const load = useCallback(async () => {
    setLoading(true);
    setStatsError(null);
    try {
      const res = await fetch(`/api/admin/grants/${cycleId}/ai-routing-stats`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load AI stats");
      setStats(data);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    if (values.ai_scoring_enabled) load();
  }, [values.ai_scoring_enabled, load]);

  const sampleRate = Math.max(0, Math.min(100, Number(values.ai_sample_rate) || 0)) / 100;
  const scoredCount = stats ? stats.scoredHistogram.reduce((a, b) => a + b, 0) : 0;
  const routing = values.ai_scoring_enabled && values.ai_score_cutoff !== "";

  return (
    <div className="border-t border-nfw-blackberry/10 pt-4 mt-4 space-y-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={values.ai_scoring_enabled}
          onChange={(e) => set({ ai_scoring_enabled: e.target.checked })}
          className="mt-0.5 w-4 h-4 accent-nfw-wisteria"
        />
        <div>
          <span className="text-sm font-semibold text-nfw-blackberry">AI Review</span>
          <p className="text-xs text-nfw-blackberry/50 mt-0.5">
            The AI scores each eligible application on the rubric within a few minutes of submission. With a
            cutoff set, Reviewer 1 only sees applications at or above it, plus a random sample of the rest.
            Reviewer 1 never sees AI scores.
          </p>
        </div>
      </label>

      {values.ai_scoring_enabled && (
        <div className="pl-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>AI score cutoff (0–9)</label>
              <select
                value={values.ai_score_cutoff}
                onChange={(e) => set({ ai_score_cutoff: e.target.value })}
                className={inputClass}
              >
                <option value="">Shadow mode — score only, don&apos;t filter</option>
                {AI_CUTOFF_OPTIONS.map((c) => (
                  <option key={c} value={String(c)}>
                    {c.toFixed(1)} and above
                  </option>
                ))}
              </select>
              <p className="text-xs text-nfw-blackberry/50 mt-1">
                Lowering it moves held applications into Reviewer 1&apos;s queue. Raising it only affects new
                applications; nothing already in her queue is removed.
              </p>
            </div>
            <div>
              <label className={labelClass}>Random sample below cutoff (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={values.ai_sample_rate}
                onChange={(e) => set({ ai_sample_rate: e.target.value })}
                className={inputClass}
              />
              <p className="text-xs text-nfw-blackberry/50 mt-1">
                Sent to Reviewer 1 unmarked, to check the AI isn&apos;t screening out strong applicants.
              </p>
            </div>
            <div>
              <label className={labelClass}>Reviewer 2 cap</label>
              <input
                type="number"
                min={1}
                step={1}
                placeholder="No cap"
                value={values.reviewer2_cap}
                onChange={(e) => set({ reviewer2_cap: e.target.value })}
                className={inputClass}
              />
              <p className="text-xs text-nfw-blackberry/50 mt-1">
                Top applications by Reviewer 1 score sent to Reviewer 2. Blank = everything scored 7+ or flagged.
              </p>
            </div>
            <div>
              <label className={labelClass}>…of which Needs Discussion</label>
              <input
                type="number"
                min={0}
                step={1}
                value={values.reviewer2_discussion_slots}
                onChange={(e) => set({ reviewer2_discussion_slots: e.target.value })}
                className={inputClass}
              />
              <p className="text-xs text-nfw-blackberry/50 mt-1">
                Slots within the cap reserved for applications Reviewer 1 flags.
              </p>
            </div>
          </div>

          <div className="bg-nfw-dove/50 border border-nfw-blackberry/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-nfw-blackberry">Reviewer 1 volume by cutoff</p>
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-1 text-xs text-nfw-aubergine hover:underline disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Refresh
              </button>
            </div>
            {statsError && <p className="text-xs text-red-600">{statsError}</p>}
            {stats && (
              <>
                <p className="text-xs text-nfw-blackberry/60 mb-3">
                  {stats.total.toLocaleString()} applications · {scoredCount.toLocaleString()} scored ·{" "}
                  {stats.pending.toLocaleString()} waiting to be scored · {stats.alreadyReviewed.toLocaleString()} already
                  reviewed · {Math.round(stats.elapsed * 100)}% of the application window elapsed
                  {routing && (
                    <>
                      {" "}· Now: {stats.queues.reviewer1 + stats.queues.sampled} with Reviewer 1, {stats.queues.held} held
                    </>
                  )}
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-nfw-blackberry/50">
                      <th className="py-1 font-semibold">Cutoff</th>
                      <th className="py-1 font-semibold text-right">Reviewer 1 so far</th>
                      <th className="py-1 font-semibold text-right">Projected at close</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TABLE_CUTOFFS.map((c) => {
                      const p = projectReviewer1(stats, c, sampleRate);
                      const selected = values.ai_score_cutoff !== "" && Number(values.ai_score_cutoff) === c;
                      return (
                        <tr key={c} className={selected ? "bg-nfw-lilac/30 font-semibold" : ""}>
                          <td className="py-1">{c.toFixed(1)}</td>
                          <td className="py-1 text-right">{p.soFar.toLocaleString()}</td>
                          <td className="py-1 text-right">{p.atClose === null ? "—" : `~${p.atClose.toLocaleString()}`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-xs text-nfw-blackberry/40 mt-2">
                  Includes applications already reviewed and the random sample. Projection assumes applications keep
                  arriving at the same rate; early in a cycle it&apos;s rough. Target is 300–500 across the month&apos;s grants.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
