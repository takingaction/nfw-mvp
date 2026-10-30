/**
 * Resend "Grant: Approved" emails that failed when a cycle was finalized.
 *
 * BACKGROUND:
 * On the Oct 2026 Self Care cycle (8f2727f3-...), one winner's approval email
 * failed with a transient TEMPLATE_NOT_FOUND. Random-draw cycles can't reach
 * the combined scoring page that hosts "Retry failed emails", and the
 * retry-failed API leaves the old failed row in place, so running it twice
 * emails the winner twice. This script does the same send safely.
 *
 * WHO: grants in the cycle with a `failed` approved row in grant_email_log,
 * that are still awarded (approved / payment_pending / payment_sent), and
 * that have NO `sent` or `already_sent` approved row. Re-running after a
 * successful --apply therefore finds nothing to do.
 *
 * Uses the same sender as finalization (sendGrantApprovedEmail), so the email
 * is identical to what the other winners received. Rejections are out of
 * scope: use the finalize "Send remaining emails" flow for those.
 *
 * USAGE:
 *   npx tsx scripts/resend-failed-approval-emails.ts --cycle=<cycleId>          # dry run
 *   npx tsx scripts/resend-failed-approval-emails.ts --cycle=<cycleId> --apply
 *
 * OUTPUT: summary on stdout + CSV log in REPORTS-IGNORE/ (apply mode).
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

const AWARDED = new Set(["approved", "payment_pending", "payment_sent"]);

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main() {
  const cycleId = arg("cycle");
  const apply = process.argv.includes("--apply");
  if (!cycleId) {
    console.error("Usage: npx tsx scripts/resend-failed-approval-emails.ts --cycle=<cycleId> [--apply]");
    process.exit(1);
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: cycle, error: cycleErr } = await supabaseAdmin
    .from("grant_cycles")
    .select("id, cycle_name, amount_per_grant, final_approved_at")
    .eq("id", cycleId)
    .single();
  if (cycleErr || !cycle) throw new Error(`Cycle not found: ${cycleErr?.message ?? cycleId}`);
  if (!cycle.final_approved_at) throw new Error("Cycle is not finalized; nothing to resend.");

  const { data: logs, error: logErr } = await supabaseAdmin
    .from("grant_email_log")
    .select("grant_id, status, recipient_email, retry_count")
    .eq("cycle_id", cycleId)
    .eq("email_type", "approved");
  if (logErr) throw new Error(`Could not load email log: ${logErr.message}`);

  const emailed = new Set(
    (logs ?? []).filter((l) => l.status === "sent" || l.status === "already_sent").map((l) => l.grant_id),
  );
  const failedByGrant = new Map<string, { retry_count: number | null }>();
  for (const l of logs ?? []) {
    if (l.status === "failed" && !emailed.has(l.grant_id)) {
      const prev = failedByGrant.get(l.grant_id);
      if (!prev || (l.retry_count ?? 0) > (prev.retry_count ?? 0)) failedByGrant.set(l.grant_id, l);
    }
  }

  console.log(`Cycle: ${cycle.cycle_name} (${cycle.id})`);
  console.log(`Approved emails already sent: ${emailed.size}`);
  console.log(`Failed approved emails with no successful send: ${failedByGrant.size}`);
  if (failedByGrant.size === 0) {
    console.log("Nothing to do.");
    return;
  }

  const { data: grants, error: grantErr } = await supabaseAdmin
    .from("grants")
    .select("id, status, profiles:user_id (full_name, email)")
    .in("id", [...failedByGrant.keys()]);
  if (grantErr) throw new Error(`Could not load grants: ${grantErr.message}`);

  type Target = { grantId: string; email: string; name: string; retryCount: number };
  const targets: Target[] = [];
  for (const g of grants ?? []) {
    const profile = Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
    if (!AWARDED.has(g.status)) {
      console.log(`  SKIP ${g.id}: status is "${g.status}", not awarded`);
      continue;
    }
    if (!profile?.email) {
      console.log(`  SKIP ${g.id}: no email on profile`);
      continue;
    }
    targets.push({
      grantId: g.id,
      email: profile.email,
      name: profile.full_name || "there",
      retryCount: failedByGrant.get(g.id)?.retry_count ?? 0,
    });
  }

  for (const t of targets) console.log(`  ${apply ? "SEND" : "WOULD SEND"} ${t.grantId} -> ${t.email}`);

  if (!apply) {
    console.log(`\nDry run. Re-run with --apply to send ${targets.length} email(s).`);
    return;
  }

  // Imported after loadEnv so the email module sees RESEND_API_KEY etc.
  const { sendGrantApprovedEmail } = await import("../lib/email");

  const rows: string[] = ["grant_id,email,result,resend_id,error"];
  for (const t of targets) {
    const result = await sendGrantApprovedEmail({
      to: t.email,
      name: t.name,
      grantCycleName: cycle.cycle_name,
      amount: cycle.amount_per_grant,
      ctaUrl: `https://nationalfundforwomen.org/grants/view/${t.grantId}`,
    });
    const { error: insErr } = await supabaseAdmin.from("grant_email_log").insert({
      grant_id: t.grantId,
      cycle_id: cycleId,
      email_type: "approved",
      recipient_email: t.email,
      status: result.success ? "sent" : "failed",
      resend_email_id: result.resendId ?? null,
      error_message: result.error ?? null,
      retry_count: t.retryCount + 1,
      last_resend_status: result.success ? "sent" : "failed",
    });
    if (insErr) console.error(`  ! log insert failed for ${t.grantId}: ${insErr.message}`);
    console.log(`  ${result.success ? "SENT" : "FAILED"} ${t.email}${result.error ? ` (${result.error})` : ""}`);
    rows.push([t.grantId, t.email, result.success ? "sent" : "failed", result.resendId ?? "", result.error ?? ""].join(","));
    await new Promise((r) => setTimeout(r, 200));
  }

  const dir = path.join(process.cwd(), "REPORTS-IGNORE");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `resend-approval-${cycleId.slice(0, 8)}-${new Date().toISOString().replace(/[:.]/g, "").slice(0, 17)}.csv`);
  fs.writeFileSync(file, rows.join("\n") + "\n");
  console.log(`\nLog: ${path.relative(process.cwd(), file)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
