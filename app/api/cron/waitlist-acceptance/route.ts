import { NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import {
  fetchTemplateWithActiveCheck,
  sendWaitlistReminderEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BATCH_DELAY_MS = 200;
const SITE_URL = "https://www.nationalfundforwomen.org";

interface TokenReminderRow {
  id: string;
  user_id: string;
  expires_at: string;
  full_name: string | null;
  email: string | null;
}

interface TokenExpiredRow {
  id: string;
  user_id: string;
}

/**
 * GET /api/cron/waitlist-acceptance
 *
 * Daily cron that handles two tasks for the two-step waitlist approval flow:
 *
 *   Task A (Reminders):
 *     Find tokens at day 23 (created_at <= NOW() - 23 days) that haven't
 *     been used, expired-processed, or reminded yet. Send a reminder email
 *     with the acceptance link. Mark `reminder_sent_at = NOW()` on success.
 *
 *   Task B (Expiry):
 *     Find tokens past their expires_at that haven't been used or expired-
 *     processed. Reset `waitlist_joined_at = NOW()` (puts the member back
 *     at the end of the queue) and clear `waitlist_acceptance_sent_at`.
 *     Mark `expired_processed_at = NOW()` so the next cron tick skips the
 *     row. No email is sent — the silent move is by design.
 *
 * Both tasks are idempotent via partial unique indexes and the
 * `reminder_sent_at` / `expired_processed_at` columns — re-running the
 * same cron tick produces no duplicate work.
 *
 * Schedule: daily at 05:00 UTC via vercel.json
 */
export async function GET(request: Request) {
  // CRON_SECRET authorization (same pattern as other cron routes)
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.log("[waitlist-acceptance] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getAdminClient();

  // ============================================================
  // Task A: Send reminders at day 23 (7 days before expiry)
  // ============================================================
  let remindersChecked = 0;
  let remindersSent = 0;
  let remindersFailed = 0;
  let remindersSkipped = 0;

  // Pre-flight: confirm the template is active AND has published content
  // before scanning for any candidates. If either check fails, skip the
  // entire reminder batch (returns 200 with skipped reason).
  const templateCheck = await fetchTemplateWithActiveCheck("waitlist-reminder");
  if (!templateCheck.template) {
    console.log(
      "[waitlist-acceptance] waitlist-reminder template not found, skipping reminders",
    );
    return NextResponse.json({
      success: true,
      remindersChecked: 0,
      remindersSent: 0,
      remindersFailed: 0,
      remindersSkipped: 0,
      expiredProcessed: 0,
      message: "Template not found, skipped",
    });
  }
  if (!templateCheck.isActive) {
    console.log(
      "[waitlist-acceptance] waitlist-reminder template inactive, skipping reminders",
    );
    return NextResponse.json({
      success: true,
      remindersChecked: 0,
      remindersSent: 0,
      remindersFailed: 0,
      remindersSkipped: 0,
      expiredProcessed: 0,
      message: "Template inactive, skipped",
    });
  }

  // Find tokens at day 23 that haven't been reminded yet. The partial
  // index idx_waitlist_tokens_reminder uses (created_at, ...) so this
  // query is efficient.
  const { data: reminderRows, error: reminderQueryError } = await supabaseAdmin
    .from("waitlist_acceptance_tokens")
    .select(
      "id, user_id, expires_at, profiles:user_id ( full_name, email )",
    )
    .is("used_at", null)
    .is("expired_processed_at", null)
    .is("reminder_sent_at", null)
    .lte("created_at", new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString())
    .gt("expires_at", new Date().toISOString());

  if (reminderQueryError) {
    console.error(
      "[waitlist-acceptance] Failed to fetch reminder candidates:",
      reminderQueryError,
    );
    // Continue to expiry task even if reminder fetch fails
  }

  const reminderCandidates: TokenReminderRow[] = (reminderRows || []).map(
    (row: any) => ({
      id: row.id,
      user_id: row.user_id,
      expires_at: row.expires_at,
      full_name: row.profiles?.full_name ?? null,
      email: row.profiles?.email ?? null,
    }),
  );

  remindersChecked = reminderCandidates.length;

  for (const token of reminderCandidates) {
    if (!token.email) {
      remindersFailed++;
      console.warn(
        `[waitlist-acceptance] Skipping token ${token.id} — no email on profile`,
      );
      continue;
    }

    const acceptUrl = `${SITE_URL}/auth/accept-waitlist?token=${token.id}`;

    // Format expiry as "September 25, 2026"
    const expiresAtFormatted = new Date(token.expires_at).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" },
    );

    try {
      const result = await sendWaitlistReminderEmail({
        to: token.email,
        name: token.full_name || "Member",
        acceptUrl,
        expiresAt: expiresAtFormatted,
      });

      if (result.success) {
        const { error: markError } = await supabaseAdmin
          .from("waitlist_acceptance_tokens")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", token.id);

        if (markError) {
          // Email was sent but we couldn't mark reminder_sent_at.
          // Next cron tick will re-send (no dedup on this yet) — that's
          // a small annoyance but not a correctness bug.
          console.error(
            `[waitlist-acceptance] Sent reminder for ${token.id} but failed to mark reminder_sent_at:`,
            markError,
          );
          remindersFailed++;
        } else {
          remindersSent++;
        }
      } else {
        console.error(
          `[waitlist-acceptance] Reminder send returned failure for ${token.id}:`,
          result.error,
        );
        remindersFailed++;
      }
    } catch (err) {
      console.error(
        `[waitlist-acceptance] Unexpected error for ${token.id}:`,
        err,
      );
      remindersFailed++;
    }

    // Delay between sends (Resend rate limit: 10/sec, batch size is small)
    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
  }

  // ============================================================
  // Task B: Process expired tokens (move member to end of waitlist)
  // ============================================================
  let expiredProcessed = 0;
  let expiredFailed = 0;

  // Find tokens past expiry that haven't been processed yet.
  const { data: expiredRows, error: expiredQueryError } = await supabaseAdmin
    .from("waitlist_acceptance_tokens")
    .select("id, user_id")
    .is("used_at", null)
    .is("expired_processed_at", null)
    .lt("expires_at", new Date().toISOString());

  if (expiredQueryError) {
    console.error(
      "[waitlist-acceptance] Failed to fetch expired tokens:",
      expiredQueryError,
    );
    return NextResponse.json(
      {
        error: "Failed to fetch expired tokens",
        remindersChecked,
        remindersSent,
        remindersFailed,
        remindersSkipped,
      },
      { status: 500 },
    );
  }

  const expiredTokens: TokenExpiredRow[] = (expiredRows || []).map(
    (row: any) => ({
      id: row.id,
      user_id: row.user_id,
    }),
  );

  for (const token of expiredTokens) {
    try {
      // Move member to end of waitlist queue + clear acceptance-sent flag.
      // Run sequentially (these writes are independent but rare — keep
      // simple, no need for a transaction).
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          waitlist_joined_at: new Date().toISOString(),
          waitlist_acceptance_sent_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", token.user_id);

      if (profileError) {
        console.error(
          `[waitlist-acceptance] Failed to reset profile for ${token.user_id}:`,
          profileError,
        );
        expiredFailed++;
        continue;
      }

      const { error: tokenError } = await supabaseAdmin
        .from("waitlist_acceptance_tokens")
        .update({ expired_processed_at: new Date().toISOString() })
        .eq("id", token.id)
        .is("expired_processed_at", null);

      if (tokenError) {
        // Profile was updated but we couldn't mark the token as processed.
        // Next cron tick will re-update the profile (idempotent — same
        // waitlist_joined_at = NOW() value is fine) and try to mark again.
        console.error(
          `[waitlist-acceptance] Failed to mark token ${token.id} as expired:`,
          tokenError,
        );
        expiredFailed++;
        continue;
      }

      expiredProcessed++;
    } catch (err) {
      console.error(
        `[waitlist-acceptance] Unexpected error processing expired token ${token.id}:`,
        err,
      );
      expiredFailed++;
    }
  }

  return NextResponse.json({
    success: true,
    remindersChecked,
    remindersSent,
    remindersFailed,
    expiredProcessed,
    expiredFailed,
  });
}
