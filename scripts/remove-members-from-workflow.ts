/**
 * Remove members who were wrongly put in the "Newsletter - Warm Leads"
 * segment from a Flodesk workflow, so they get no further warm-lead emails.
 *
 * BACKGROUND:
 * Until 9a778750 the newsletter sync's profile lookup failed silently for the
 * first 1000 coming_soon_emails rows, so account holders were treated as
 * leads (709 people, 233 of them paying). The sync fix removes them from the
 * segment, but a workflow they already entered keeps sending. This script
 * removes them from that workflow. Emails already sent cannot be recalled.
 *
 * WHO: every email in flodesk_sync_newsletter (any status — the sync may
 * already have marked them removed) that matches a non-deleted profile.
 * Default levels: contributing, founding. --include-free adds everyone else
 * with an account (free, waitlist, ...).
 *
 * RUN AFTER the sync fix is deployed, or the old sync could re-enroll them.
 *
 * USAGE:
 *   npx tsx scripts/remove-members-from-workflow.ts --list-workflows
 *   npx tsx scripts/remove-members-from-workflow.ts --workflow=<id>              # dry run
 *   npx tsx scripts/remove-members-from-workflow.ts --workflow=<id> --apply
 *   ... --include-free                                                           # all account holders
 *
 * OUTPUT: summary on stdout + CSV log in REPORTS-IGNORE/ (apply mode).
 *
 * NOTE: Flodesk answers 204 whether or not the subscriber was enrolled
 * (confirmed Oct 2026: 236/236 "accepted" on a workflow none of them were
 * in). So "accepted" means the call succeeded, NOT that they were removed
 * from an active run. Verify enrollment in the Flodesk UI.
 */

import { createClient } from "@supabase/supabase-js";
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

// Imported after loadEnv so FLODESK_API_KEY is present (lib reads it lazily anyway).
import { listWorkflows, removeFromWorkflow, isFlodeskConfigured } from "../lib/flodesk";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const APPLY = flag("apply");
const INCLUDE_FREE = flag("include-free");
const WORKFLOW_ID = opt("workflow");
const PAID_LEVELS = new Set(["contributing", "founding"]);
const PAGE = 1000;
const LOOKUP_CHUNK = 100; // keep .in() URLs small — the original bug
const DELAY_MS = 700; // Flodesk: 100 req/min

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Target = { email: string; subscriberId: string | null; level: string; name: string };

async function loadTargets(): Promise<Target[]> {
  // 1. All newsletter sync rows, any status.
  const rows: { email: string; flodesk_subscriber_id: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from("flodesk_sync_newsletter")
      .select("email, flodesk_subscriber_id")
      .order("email", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`flodesk_sync_newsletter: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  const subByEmail = new Map<string, string | null>();
  for (const r of rows) {
    const e = r.email.trim().toLowerCase();
    if (!subByEmail.has(e) || r.flodesk_subscriber_id) subByEmail.set(e, r.flodesk_subscriber_id);
  }

  // 2. Which of those are account holders.
  const emails = [...subByEmail.keys()];
  const targets: Target[] = [];
  for (let i = 0; i < emails.length; i += LOOKUP_CHUNK) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("email, membership_level, full_name")
      .in("email", emails.slice(i, i + LOOKUP_CHUNK))
      .is("deleted_at", null);
    if (error) throw new Error(`profiles lookup: ${error.message}`);
    for (const p of data || []) {
      const level = p.membership_level || "unknown";
      if (!INCLUDE_FREE && !PAID_LEVELS.has(level)) continue;
      const email = p.email.toLowerCase();
      targets.push({ email, subscriberId: subByEmail.get(email) ?? null, level, name: (p.full_name || "").trim() });
    }
  }
  return targets.sort((a, b) => a.level.localeCompare(b.level) || a.email.localeCompare(b.email));
}

async function main() {
  if (!isFlodeskConfigured()) throw new Error("FLODESK_API_KEY missing from .env.local");

  const wf = await listWorkflows();
  if (!wf.ok) throw new Error(`listWorkflows: ${wf.error}`);

  if (flag("list-workflows") || !WORKFLOW_ID) {
    console.log("Workflows:");
    for (const w of wf.data) console.log(`  ${w.id}  ${w.name}${w.status ? `  [${w.status}]` : ""}`);
    if (!WORKFLOW_ID) console.log("\nRe-run with --workflow=<id> (dry run) and then --apply.");
    return;
  }

  const workflow = wf.data.find((w) => w.id === WORKFLOW_ID);
  if (!workflow) throw new Error(`Workflow ${WORKFLOW_ID} not found. Use --list-workflows.`);

  const targets = await loadTargets();
  const byLevel = targets.reduce<Record<string, number>>((m, t) => ((m[t.level] = (m[t.level] || 0) + 1), m), {});
  console.log(`Workflow: ${workflow.name} (${workflow.id})`);
  console.log(`Targets: ${targets.length}`, byLevel);
  console.log(`Missing Flodesk subscriber id (will use email): ${targets.filter((t) => !t.subscriberId).length}`);

  if (!APPLY) {
    console.log("\nDRY RUN — nothing changed. Sample:");
    for (const t of targets.slice(0, 10)) console.log(`  ${t.level.padEnd(13)} ${t.email}`);
    console.log("\nRe-run with --apply to send the removal calls.");
    return;
  }

  const log: string[] = ["email,level,result,detail"];
  let accepted = 0, notFound = 0, failed = 0, consecutiveFailures = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    let res = await removeFromWorkflow(workflow.id, t.subscriberId || t.email);
    if (!res.ok && res.rateLimited) {
      console.log("  rate limited — waiting 65s");
      await sleep(65_000);
      res = await removeFromWorkflow(workflow.id, t.subscriberId || t.email);
    }

    if (res.ok) {
      accepted++;
      consecutiveFailures = 0;
      log.push(`${t.email},${t.level},accepted_204,`);
    } else if (res.status === 404) {
      notFound++;
      consecutiveFailures = 0;
      log.push(`${t.email},${t.level},not_found_404,`);
    } else {
      failed++;
      consecutiveFailures++;
      log.push(`${t.email},${t.level},failed,"${String(res.error).replace(/"/g, '""')}"`);
      console.error(`  FAILED ${t.email}: ${res.status ?? ""} ${res.error}`);
    }

    // Safety stop: repeated real errors (bad key, wrong path, outage).
    if (consecutiveFailures >= 5) {
      console.error("\n5 failures in a row — stopping. Check the errors above before re-running.");
      break;
    }
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${targets.length}`);
    await sleep(DELAY_MS);
  }

  const dir = path.join(process.cwd(), "REPORTS-IGNORE");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `workflow-removal-${workflow.id}-${new Date().toISOString().slice(0, 19).replace(/:/g, "")}.csv`);
  fs.writeFileSync(file, log.join("\n"));

  console.log(`\nAccepted (204): ${accepted}  Not found (404): ${notFound}  Failed: ${failed}`);
  console.log("204 does not confirm the subscriber was enrolled — verify in the Flodesk UI.");
  console.log(`Log: ${path.relative(process.cwd(), file)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
