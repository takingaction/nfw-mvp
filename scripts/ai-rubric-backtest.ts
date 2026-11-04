/**
 * Backtest AI rubric scoring (lib/grant-ai-scoring.ts) against human review
 * on closed `scored` cycles, to choose grant_cycles.ai_score_cutoff before
 * routing goes live. Read-only against production unless --apply is passed.
 *
 * Uses the Message Batches API (half price, no rate-limit pressure). Results
 * usually arrive within the hour.
 *
 * STEPS
 *   1. submit   export applications that Reviewer 1 scored, send one batch
 *        npx tsx scripts/ai-rubric-backtest.ts submit                      # Sep 1 2026 onward
 *        npx tsx scripts/ai-rubric-backtest.ts submit --sample=100         # cheap pilot first
 *        npx tsx scripts/ai-rubric-backtest.ts submit --since=2026-09-01 --cycles=<id>,<id>
 *        npx tsx scripts/ai-rubric-backtest.ts submit --guidance=REPORTS-IGNORE/ai-backtest/guidance.json
 *          guidance.json = { "<cycle_id>": "reviewer guidance text", ... } — lets you
 *          test draft guidance without writing it to grant_cycles.
 *   2. collect  wait for the batch, save scores
 *        npx tsx scripts/ai-rubric-backtest.ts collect --run=<run-id>
 *        npx tsx scripts/ai-rubric-backtest.ts collect --run=<run-id> --apply   # also upsert grant_ai_scores (needs migration 218)
 *   3. report   compare to humans, print cutoff table, write CSVs
 *        npx tsx scripts/ai-rubric-backtest.ts report --run=<run-id> [--min=300 --max=500]
 *
 * Everything is written to REPORTS-IGNORE/ai-backtest/<run-id>/ (gitignored;
 * contains applicant text). Console output never includes applicant text.
 *
 * WHAT "BASE" MEANS: only applications Reviewer 1 actually scored. Apps that
 * were AI-flagged and skipped never got a human score, so they can't be
 * compared; in live routing they are also excluded (ineligible apps are not
 * scored), so routed counts here approximate live counts.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import {
  buildRubricRequest,
  resultFromResponse,
  toScoreRow,
  RUBRIC_PROMPT_VERSION,
  RUBRIC_MODEL,
  type RubricResult,
} from "../lib/grant-ai-scoring";

function loadEnv(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const writeCsv = (file: string, header: string[], rows: unknown[][]) =>
  fs.writeFileSync(file, [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n");

const ROOT = path.join(process.cwd(), "REPORTS-IGNORE", "ai-backtest");

interface AppRow {
  grant_id: string;
  cycle_id: string;
  cycle_name: string;
  month: string; // cycle end month, PT, YYYY-MM
  who_are_you: string;
  biggest_challenge: string;
  fund_usage: string;
  r1_total: number;
  r1_needs_discussion: boolean;
  r2_total: number | null; // non-null = advanced to Reviewer 2
  awarded: boolean;
}

interface Manifest {
  run_id: string;
  batch_id: string;
  prompt_version: string;
  model: string;
  created_at: string;
  args: Record<string, string | undefined>;
  cycles: Array<{ id: string; cycle_name: string; month: string; reviewer_guidance: string | null }>;
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
  return createClient(url, key);
}

async function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing from .env.local");
  const mod = await import("@anthropic-ai/sdk");
  return new mod.default({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function ptMonth(iso: string | null): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  const y = d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", year: "numeric" });
  const m = d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "2-digit" });
  return `${y}-${m}`;
}

// ---------------------------------------------------------------------------
// submit
// ---------------------------------------------------------------------------
async function submit() {
  const db = admin();
  const since = arg("since") ?? "2026-09-01";
  const cycleFilter = arg("cycles")?.split(",").map((s) => s.trim()).filter(Boolean);
  const sample = arg("sample") ? Number(arg("sample")) : null;
  const guidancePath = arg("guidance");
  const guidanceOverride: Record<string, string> = guidancePath
    ? JSON.parse(fs.readFileSync(guidancePath, "utf-8"))
    : {};

  let cq = db
    .from("grant_cycles")
    .select("id, cycle_name, description, end_date, start_date, status, selection_method, is_testing_only")
    .eq("status", "closed")
    .eq("selection_method", "scored")
    .gte("start_date", since);
  if (cycleFilter?.length) cq = cq.in("id", cycleFilter);
  const { data: cycles, error: cErr } = await cq;
  if (cErr) throw cErr;
  const realCycles = (cycles ?? []).filter((c: any) => c.is_testing_only !== true);
  if (!realCycles.length) throw new Error("No matching closed scored cycles");

  // reviewer_guidance may not exist yet (migration 218 not applied) — fetch separately and tolerate.
  const dbGuidance: Record<string, string | null> = {};
  {
    const { data, error } = await db.from("grant_cycles").select("id, reviewer_guidance").in("id", realCycles.map((c: any) => c.id));
    if (!error) for (const r of data ?? []) dbGuidance[(r as any).id] = (r as any).reviewer_guidance ?? null;
  }

  const apps: AppRow[] = [];
  for (const c of realCycles as any[]) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db
        .from("grants")
        .select(
          "id, cycle_id, status, who_are_you, biggest_challenge, fund_usage, grant_scores!inner(reviewer_name, total_score, needs_discussion, is_complete), grant_tentative_approvals(is_approved)",
        )
        .eq("cycle_id", c.id)
        .order("id")
        .range(from, from + 999);
      if (error) throw error;
      for (const g of (data ?? []) as any[]) {
        const first = g.grant_scores.find((s: any) => s.reviewer_name === "first" && s.is_complete);
        if (!first) continue;
        const second = g.grant_scores.find((s: any) => s.reviewer_name === "second" && s.is_complete);
        const ta = Array.isArray(g.grant_tentative_approvals) ? g.grant_tentative_approvals : [g.grant_tentative_approvals].filter(Boolean);
        apps.push({
          grant_id: g.id,
          cycle_id: c.id,
          cycle_name: c.cycle_name,
          month: ptMonth(c.end_date),
          who_are_you: g.who_are_you ?? "",
          biggest_challenge: g.biggest_challenge ?? "",
          fund_usage: g.fund_usage ?? "",
          r1_total: Number(first.total_score),
          r1_needs_discussion: !!first.needs_discussion,
          r2_total: second ? Number(second.total_score) : null,
          awarded: ["approved", "payment_sent", "funded"].includes(g.status) || ta.some((t: any) => t?.is_approved),
        });
      }
      if (!data || data.length < 1000) break;
    }
  }

  let chosen = apps;
  if (sample && sample < apps.length) {
    // Deterministic, stratified-ish: shuffle by hash of id, keep all awardees in the pilot.
    const h = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const awardees = apps.filter((a) => a.awarded);
    const rest = apps.filter((a) => !a.awarded).sort((a, b) => h(a.grant_id) - h(b.grant_id));
    chosen = [...awardees.slice(0, Math.ceil(sample / 4)), ...rest].slice(0, sample);
  }

  const cycleMeta = new Map((realCycles as any[]).map((c) => [c.id, c]));
  const requests = chosen.map((a) => {
    const c = cycleMeta.get(a.cycle_id);
    return {
      custom_id: a.grant_id,
      params: buildRubricRequest({
        cycleName: c.cycle_name ?? "",
        cycleDescription: c.description ?? "",
        reviewerGuidance: guidanceOverride[a.cycle_id] ?? dbGuidance[a.cycle_id] ?? null,
        whoAreYou: a.who_are_you,
        biggestChallenge: a.biggest_challenge,
        fundUsage: a.fund_usage,
      }),
    };
  });

  // Group by cycle so the cached cycle block is reused within the batch.
  requests.sort((x, y) => {
    const cx = chosen.find((a) => a.grant_id === x.custom_id)!.cycle_id;
    const cy = chosen.find((a) => a.grant_id === y.custom_id)!.cycle_id;
    return cx.localeCompare(cy);
  });

  const client = await anthropic();
  const batch = await client.messages.batches.create({ requests: requests as any });

  const runId = `${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}-${RUBRIC_PROMPT_VERSION}${sample ? `-s${sample}` : ""}`;
  const dir = path.join(ROOT, runId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "dataset.json"), JSON.stringify(chosen));
  const manifest: Manifest = {
    run_id: runId,
    batch_id: batch.id,
    prompt_version: RUBRIC_PROMPT_VERSION,
    model: RUBRIC_MODEL,
    created_at: new Date().toISOString(),
    args: { since, cycles: arg("cycles"), sample: arg("sample"), guidance: guidancePath },
    cycles: (realCycles as any[]).map((c) => ({
      id: c.id,
      cycle_name: c.cycle_name,
      month: ptMonth(c.end_date),
      reviewer_guidance: guidanceOverride[c.id] ?? dbGuidance[c.id] ?? null,
    })),
  };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));

  const byCycle = new Map<string, number>();
  for (const a of chosen) byCycle.set(a.cycle_name, (byCycle.get(a.cycle_name) ?? 0) + 1);
  console.log(`Submitted ${chosen.length} applications (${chosen.filter((a) => a.awarded).length} awardees) as batch ${batch.id}`);
  for (const [name, n] of byCycle) console.log(`  ${n.toString().padStart(5)}  ${name}`);
  console.log(`\nRun: ${runId}\nNext: npx tsx scripts/ai-rubric-backtest.ts collect --run=${runId}`);
}

// ---------------------------------------------------------------------------
// collect
// ---------------------------------------------------------------------------
function loadRun(): { dir: string; manifest: Manifest; dataset: AppRow[] } {
  const runId = arg("run");
  if (!runId) throw new Error("--run=<run-id> is required");
  const dir = path.join(ROOT, runId);
  const manifest: Manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf-8"));
  const dataset: AppRow[] = JSON.parse(fs.readFileSync(path.join(dir, "dataset.json"), "utf-8"));
  return { dir, manifest, dataset };
}

async function collect() {
  const { dir, manifest, dataset } = loadRun();
  const apply = process.argv.includes("--apply");
  const client = await anthropic();

  for (;;) {
    const b = await client.messages.batches.retrieve(manifest.batch_id);
    const c = b.request_counts;
    console.log(`[${new Date().toLocaleTimeString()}] ${b.processing_status} — processing ${c.processing}, ok ${c.succeeded}, errored ${c.errored}, expired ${c.expired}`);
    if (b.processing_status === "ended") break;
    await sleep(60_000);
  }

  const results: Record<string, RubricResult | { error: string }> = {};
  for await (const r of await client.messages.batches.results(manifest.batch_id)) {
    if (r.result.type === "succeeded") {
      results[r.custom_id] = resultFromResponse(r.result.message) ?? { error: "unparseable" };
    } else {
      results[r.custom_id] = { error: r.result.type };
    }
  }
  fs.writeFileSync(path.join(dir, "results.json"), JSON.stringify(results));

  const ok = Object.values(results).filter((r) => !("error" in r)).length;
  console.log(`\nScored ${ok} / ${dataset.length}. Failures: ${dataset.length - ok}.`);

  if (apply) {
    const db = admin();
    const byId = new Map(dataset.map((a) => [a.grant_id, a]));
    const rows = Object.entries(results)
      .filter(([, r]) => !("error" in r))
      .map(([id, r]) => toScoreRow(id, byId.get(id)!.cycle_id, r as RubricResult, true));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db.from("grant_ai_scores").upsert(rows.slice(i, i + 500), { onConflict: "grant_id,prompt_version" });
      if (error) throw error;
    }
    console.log(`Upserted ${rows.length} rows into grant_ai_scores (prompt ${manifest.prompt_version}).`);
  }
  console.log(`Next: npx tsx scripts/ai-rubric-backtest.ts report --run=${manifest.run_id}`);
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
function ranks(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}
function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n < 3) return NaN;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}
const spearman = (a: number[], b: number[]) => pearson(ranks(a), ranks(b));
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(0)}%` : "—");
const f2 = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "—");

function report() {
  const { dir, manifest, dataset } = loadRun();
  const min = Number(arg("min") ?? 300);
  const max = Number(arg("max") ?? 500);
  const results: Record<string, RubricResult | { error: string }> = JSON.parse(
    fs.readFileSync(path.join(dir, "results.json"), "utf-8"),
  );
  type Joined = AppRow & { ai: number; res: RubricResult };
  const rows: Joined[] = dataset
    .filter((a) => results[a.grant_id] && !("error" in results[a.grant_id]))
    .map((a) => ({ ...a, ai: (results[a.grant_id] as RubricResult).total, res: results[a.grant_id] as RubricResult }));

  console.log(`Run ${manifest.run_id} — prompt ${manifest.prompt_version}, ${manifest.model}`);
  console.log(`Scored ${rows.length} of ${dataset.length} (failures excluded).${manifest.args.sample ? "  PILOT SAMPLE — volumes below are not monthly totals." : ""}\n`);

  // 1. Agreement per cycle
  console.log("AGREEMENT WITH REVIEWER 1");
  console.log("cycle".padEnd(42) + "n".padStart(6) + "  rho   meanAI  meanR1  |AI-R1|  guidance");
  const cycles = [...new Set(rows.map((r) => r.cycle_id))];
  for (const cid of [...cycles, "ALL"]) {
    const sub = cid === "ALL" ? rows : rows.filter((r) => r.cycle_id === cid);
    const name = cid === "ALL" ? "ALL" : sub[0].cycle_name;
    const g = cid === "ALL" ? "" : manifest.cycles.find((c) => c.id === cid)?.reviewer_guidance ? "yes" : "no";
    const mae = sub.reduce((s, r) => s + Math.abs(r.ai - r.r1_total), 0) / sub.length;
    console.log(
      name.slice(0, 41).padEnd(42) + String(sub.length).padStart(6) +
      `  ${f2(spearman(sub.map((r) => r.ai), sub.map((r) => r.r1_total)))}` +
      `  ${f2(sub.reduce((s, r) => s + r.ai, 0) / sub.length).padStart(6)}` +
      `  ${f2(sub.reduce((s, r) => s + r.r1_total, 0) / sub.length).padStart(6)}` +
      `  ${f2(mae).padStart(7)}  ${g}`,
    );
  }

  // 2. Top-100 overlap per month (the Oct 15 question)
  console.log("\nTOP 100 OVERLAP (AI top 100 vs Reviewer 1 top 100, per month)");
  const months = [...new Set(rows.map((r) => r.month))].sort();
  for (const m of months) {
    const sub = rows.filter((r) => r.month === m);
    const k = Math.min(100, sub.length);
    const topAi = new Set([...sub].sort((a, b) => b.ai - a.ai).slice(0, k).map((r) => r.grant_id));
    const topR1 = [...sub].sort((a, b) => b.r1_total - a.r1_total).slice(0, k);
    const overlap = topR1.filter((r) => topAi.has(r.grant_id)).length;
    const aw = sub.filter((r) => r.awarded);
    const awInTopAi = aw.filter((r) => topAi.has(r.grant_id)).length;
    console.log(`  ${m}: ${overlap}/${k} overlap · awardees in AI top ${k}: ${awInTopAi}/${aw.length}`);
  }

  // 3. Cutoff table
  console.log(`\nCUTOFF TABLE (target Reviewer 1 volume ${min}–${max}/month)`);
  console.log("cutoff  " + months.map((m) => m.padStart(9)).join("") + "   awardees kept   R2-advanced kept   R1 top-25% kept");
  const awardees = rows.filter((r) => r.awarded);
  const advanced = rows.filter((r) => r.r2_total !== null);
  const q75 = [...rows].sort((a, b) => a.r1_total - b.r1_total)[Math.floor(rows.length * 0.75)]?.r1_total ?? 0;
  const topQ = rows.filter((r) => r.r1_total >= q75);
  const table: unknown[][] = [];
  let suggestion: number | null = null;
  for (let c = 0; c <= 9; c += 0.5) {
    const routed = (sub: Joined[]) => sub.filter((r) => r.ai >= c).length;
    const perMonth = months.map((m) => routed(rows.filter((r) => r.month === m)));
    const awKept = routed(awardees), advKept = routed(advanced), tqKept = routed(topQ);
    console.log(
      c.toFixed(1).padStart(6) + "  " + perMonth.map((n) => String(n).padStart(9)).join("") +
      `   ${`${awKept}/${awardees.length} ${pct(awKept, awardees.length)}`.padStart(13)}` +
      `   ${`${advKept}/${advanced.length} ${pct(advKept, advanced.length)}`.padStart(16)}` +
      `   ${`${tqKept}/${topQ.length} ${pct(tqKept, topQ.length)}`.padStart(15)}`,
    );
    table.push([c, ...perMonth, awKept, awardees.length, advKept, advanced.length, tqKept, topQ.length]);
    if (suggestion === null && perMonth.every((n) => n <= max)) suggestion = c;
  }
  writeCsv(path.join(dir, "cutoff-table.csv"),
    ["cutoff", ...months.map((m) => `routed_${m}`), "awardees_kept", "awardees", "r2_advanced_kept", "r2_advanced", "r1_topq_kept", "r1_topq"], table);
  if (suggestion !== null && !manifest.args.sample) {
    console.log(`\nLowest cutoff keeping every month ≤ ${max}: ${suggestion.toFixed(1)}. Check the awardee column on that row before choosing.`);
  }

  // 4. Inspection files
  const sorted = [...rows].sort((a, b) => a.ai - b.ai);
  writeCsv(path.join(dir, "scores.csv"),
    ["grant_id", "cycle", "month", "ai_total", "ai_intent", "ai_authenticity", "ai_impact", "ai_urgent", "r1_total", "r1_needs_discussion", "r2_total", "awarded", "ai_summary"],
    sorted.map((r) => [r.grant_id, r.cycle_name, r.month, r.ai, r.res.scores.intent_feasibility.score, r.res.scores.authenticity.score,
      r.res.scores.impact.score, r.res.scores.urgent.value, r.r1_total, r.r1_needs_discussion, r.r2_total ?? "", r.awarded, r.res.scores.summary]));
  // Awardees the AI scored lowest: the false negatives that matter most. Includes answers for review.
  writeCsv(path.join(dir, "awardees-lowest-ai.csv"),
    ["grant_id", "cycle", "ai_total", "r1_total", "r2_total", "ai_notes", "who_are_you", "biggest_challenge", "fund_usage"],
    sorted.filter((r) => r.awarded).slice(0, 30).map((r) => [r.grant_id, r.cycle_name, r.ai, r.r1_total, r.r2_total ?? "",
      JSON.stringify(r.res.scores), r.who_are_you, r.biggest_challenge, r.fund_usage]));

  // 5. Cost (tokens; price it with current rates — batch is half the standard rate)
  const tok = rows.reduce((s, r) => ({
    in: s.in + r.res.usage.inputTokens, out: s.out + r.res.usage.outputTokens,
    cr: s.cr + r.res.usage.cacheReadTokens, cw: s.cw + r.res.usage.cacheWriteTokens,
  }), { in: 0, out: 0, cr: 0, cw: 0 });
  const n = rows.length || 1;
  console.log(`\nTOKENS per application (avg): input ${Math.round(tok.in / n)}, cache read ${Math.round(tok.cr / n)}, cache write ${Math.round(tok.cw / n)}, output ${Math.round(tok.out / n)}`);
  console.log(`\nFiles: ${path.relative(process.cwd(), dir)}/{scores.csv, cutoff-table.csv, awardees-lowest-ai.csv}`);
}

const cmd = process.argv[2];
const run = cmd === "submit" ? submit : cmd === "collect" ? collect : cmd === "report" ? async () => report() : null;
if (!run) {
  console.error("Usage: npx tsx scripts/ai-rubric-backtest.ts <submit|collect|report> [options] — see header");
  process.exit(1);
}
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
