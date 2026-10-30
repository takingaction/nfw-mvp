/**
 * Backfill grant_email_log for "Grant: Not Approved" emails that Resend sent
 * but the app never recorded. This script NEVER sends email.
 *
 * BACKGROUND:
 * On the Oct 2026 Self Care cycle (8f2727f3-...), final-approve sent all 1,202
 * rejections, then was killed by the function time limit while writing log
 * rows: only 404 were recorded. The other 798 people almost certainly got the
 * email, but with no log row every "send remaining" tool would treat them as
 * unsent and email them again. This asks Resend's own records who was sent the
 * cycle's rejection email in the send window and records those as already_sent.
 *
 * MATCHING: a Resend email counts when its subject is exactly the cycle's
 * "grant-not-approved" subject (with the cycle name filled in), it was created
 * inside --from..--to, and its recipient is the profile email of a
 * not_approved grant in the cycle that has no rejected sent/already_sent row.
 *
 * OUTCOMES per unlogged applicant:
 *   record   — Resend shows it sent/delivered/opened/clicked → already_sent row
 *   problem  — Resend shows bounced/failed/complained/etc → listed, not written
 *   no match — Resend has no such email in the window → listed, not written
 * Nothing in the last two groups is sent automatically: decide case by case.
 *
 * USAGE:
 *   npx tsx scripts/backfill-rejection-email-log.ts --cycle=<id> --from=<ISO> --to=<ISO>          # dry run
 *   npx tsx scripts/backfill-rejection-email-log.ts --cycle=<id> --from=<ISO> --to=<ISO> --apply
 *
 * Self Care: --from=2026-10-30T17:43:00Z --to=2026-10-30T17:49:00Z
 *
 * OUTPUT: summary on stdout + a CSV of every unlogged applicant and outcome in
 * REPORTS-IGNORE/ (both modes).
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import * as fs from "fs";
import * as path from "path";

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

const DELIVERED_EVENTS = new Set(["sent", "delivered", "opened", "clicked", "delivery_delayed"]);

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

async function main() {
  const cycleId = arg("cycle");
  const fromArg = arg("from");
  const toArg = arg("to");
  const apply = process.argv.includes("--apply");
  if (!cycleId || !fromArg || !toArg) {
    console.error("Usage: npx tsx scripts/backfill-rejection-email-log.ts --cycle=<id> --from=<ISO> --to=<ISO> [--apply]");
    process.exit(1);
  }
  const from = new Date(fromArg);
  const to = new Date(toArg);
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) throw new Error("--from/--to must be valid ISO times with from < to");
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY missing from .env.local");

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const resend = new Resend(process.env.RESEND_API_KEY);

  // --- Cycle + exact subject the rejection email was sent with ---
  const { data: cycle, error: cycleErr } = await supabaseAdmin
    .from("grant_cycles")
    .select("id, cycle_name, final_approved_at")
    .eq("id", cycleId)
    .single();
  if (cycleErr || !cycle) throw new Error(`Cycle not found: ${cycleErr?.message ?? cycleId}`);
  if (!cycle.final_approved_at) throw new Error("Cycle is not finalized.");
  const { data: tpl, error: tplErr } = await supabaseAdmin
    .from("email_templates")
    .select("subject")
    .eq("slug", "grant-not-approved")
    .single();
  if (tplErr || !tpl) throw new Error(`Could not load grant-not-approved template: ${tplErr?.message}`);
  const subject = String(tpl.subject).replace(/\{\{\s*grantCycleName\s*\}\}/g, cycle.cycle_name);

  // --- Applicants owed a rejection email with no record of one ---
  const grants: { id: string; email: string | null }[] = [];
  for (let off = 0; ; off += 1000) {
    const { data, error } = await supabaseAdmin
      .from("grants")
      .select("id, profiles:user_id (email)")
      .eq("cycle_id", cycleId)
      .eq("status", "not_approved")
      .order("id", { ascending: true })
      .range(off, off + 999);
    if (error) throw new Error(`Could not load grants: ${error.message}`);
    for (const g of data ?? []) {
      const p = Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
      grants.push({ id: g.id, email: (p as { email?: string | null } | null)?.email ?? null });
    }
    if (!data || data.length < 1000) break;
  }
  const logged = new Set<string>();
  for (let off = 0; ; off += 1000) {
    const { data, error } = await supabaseAdmin
      .from("grant_email_log")
      .select("grant_id")
      .eq("cycle_id", cycleId)
      .eq("email_type", "rejected")
      .in("status", ["sent", "already_sent"])
      .order("id", { ascending: true })
      .range(off, off + 999);
    if (error) throw new Error(`Could not load email log: ${error.message}`);
    for (const r of data ?? []) logged.add(r.grant_id);
    if (!data || data.length < 1000) break;
  }
  const unlogged = grants.filter((g) => !logged.has(g.id));

  console.log(`Cycle: ${cycle.cycle_name} (${cycle.id})`);
  console.log(`Subject matched: "${subject}"`);
  console.log(`Window: ${from.toISOString()} .. ${to.toISOString()}`);
  console.log(`Not-approved applicants: ${grants.length}; already recorded: ${logged.size}; unlogged: ${unlogged.length}`);
  if (unlogged.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // --- Resend's record of what went out in the window (newest first) ---
  const sentTo = new Map<string, { id: string; last_event: string; count: number }>();
  let after: string | undefined;
  let scanned = 0;
  let rateLimitRetries = 0;
  console.log("Scanning Resend (newest first, 100 per page)...");
  for (let page = 0; page < 500; page++) {
    const res = await resend.emails.list(after ? { limit: 100, after } : { limit: 100 });
    if (res.error) {
      if (res.error.name === "rate_limit_exceeded" && rateLimitRetries < 10) {
        rateLimitRetries++;
        console.log(`  rate limited, waiting (retry ${rateLimitRetries}/10)`);
        await sleep(2000 * rateLimitRetries);
        page--;
        continue;
      }
      throw new Error(`Resend list failed (${res.error.name}): ${res.error.message}`);
    }
    rateLimitRetries = 0;
    const items = res.data?.data ?? [];
    scanned += items.length;
    const oldest = items[items.length - 1]?.created_at;
    console.log(`  page ${page + 1}: ${items.length} emails, back to ${oldest ?? "-"} (matched so far: ${sentTo.size})`);
    let pastWindow = false;
    for (const e of items) {
      const t = new Date(e.created_at);
      if (t < from) {
        pastWindow = true;
        continue;
      }
      if (t > to || e.subject !== subject) continue;
      for (const addr of e.to ?? []) {
        const key = addr.trim().toLowerCase();
        const prev = sentTo.get(key);
        sentTo.set(key, { id: prev?.id ?? e.id, last_event: prev?.last_event ?? e.last_event, count: (prev?.count ?? 0) + 1 });
      }
    }
    if (pastWindow || !res.data?.has_more || items.length === 0) break;
    after = items[items.length - 1].id;
    await sleep(600);
  }
  console.log(`Scanned ${scanned} Resend emails; ${sentTo.size} recipients got this subject in the window.`);

  // --- Classify ---
  type Row = { grantId: string; email: string; outcome: "record" | "problem" | "no_match"; resendId: string; lastEvent: string; copies: number };
  const rows: Row[] = unlogged.map((g) => {
    const hit = g.email ? sentTo.get(g.email.trim().toLowerCase()) : undefined;
    if (!hit) return { grantId: g.id, email: g.email ?? "", outcome: "no_match", resendId: "", lastEvent: "", copies: 0 };
    return {
      grantId: g.id,
      email: g.email!,
      outcome: DELIVERED_EVENTS.has(hit.last_event) ? "record" : "problem",
      resendId: hit.id,
      lastEvent: hit.last_event,
      copies: hit.count,
    };
  });
  const toRecord = rows.filter((r) => r.outcome === "record");
  const problems = rows.filter((r) => r.outcome === "problem");
  const noMatch = rows.filter((r) => r.outcome === "no_match");
  const dupes = rows.filter((r) => r.copies > 1);

  console.log(`\n  record as already_sent: ${toRecord.length}`);
  console.log(`  Resend shows a problem (bounced/failed/...): ${problems.length}`);
  console.log(`  no matching Resend email: ${noMatch.length}`);
  if (dupes.length) console.log(`  (got more than one copy: ${dupes.length})`);
  const byEvent: Record<string, number> = {};
  for (const r of [...toRecord, ...problems]) byEvent[r.lastEvent] = (byEvent[r.lastEvent] ?? 0) + 1;
  console.log(`  Resend last_event breakdown: ${JSON.stringify(byEvent)}`);

  const dir = path.join(process.cwd(), "REPORTS-IGNORE");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 17);
  const file = path.join(dir, `rejection-backfill-${cycleId.slice(0, 8)}-${apply ? "apply" : "dryrun"}-${stamp}.csv`);
  fs.writeFileSync(
    file,
    ["grant_id,email,outcome,resend_id,last_event,copies"]
      .concat(rows.map((r) => [r.grantId, r.email, r.outcome, r.resendId, r.lastEvent, String(r.copies)].map(csvCell).join(",")))
      .join("\n") + "\n",
  );
  console.log(`\nReport: ${path.relative(process.cwd(), file)}`);

  if (!apply) {
    console.log(`\nDry run. Re-run with --apply to record ${toRecord.length} row(s) as already_sent. Nothing is ever emailed.`);
    return;
  }

  let written = 0;
  for (let i = 0; i < toRecord.length; i += 200) {
    const batch = toRecord.slice(i, i + 200);
    const { error } = await supabaseAdmin.from("grant_email_log").insert(
      batch.map((r) => ({
        grant_id: r.grantId,
        cycle_id: cycleId,
        email_type: "rejected",
        recipient_email: r.email,
        status: "already_sent",
        resend_email_id: r.resendId,
        last_resend_status: r.lastEvent,
      })),
    );
    if (error) {
      console.error(`Insert failed after ${written} rows: ${error.message}. Re-run to continue; recorded rows are skipped.`);
      process.exit(1);
    }
    written += batch.length;
  }
  console.log(`\nRecorded ${written} row(s) as already_sent.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
