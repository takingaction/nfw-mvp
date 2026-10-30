import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendGrantApprovedEmail } from "@/lib/email";
import { sendChunkedBatchEmails } from "@/lib/email-batch";
import { loadDrawContext, syncTentativeApprovalsFromDraws } from "@/lib/grant-draw";
import { finalizeBlocker } from "@/lib/grant-draw-rules";
import { AWARDED_STATUSES } from "@/lib/grant-eligibility-checks";
import {
  EMAILED_LOG_STATUSES,
  emailedSet,
  idChunks,
  pendingFor,
  type EmailLogRow,
} from "@/lib/grant-finalize";
import { renderRejectionBody } from "@/lib/grant-rejection-body";
import { fetchAllPages } from "@/lib/supabase-paginate";

// Safety net only. With batched sends a ~1,200-applicant cycle finishes in
// well under a minute; before, the per-recipient loop took ~5 min and the
// Oct 2026 Self Care cycle was killed at the platform limit mid-logging.
export const maxDuration = 300;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type GrantRow = {
  id: string;
  user_id: string;
  status: string;
  profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
};

function profileOf(g: GrantRow) {
  return Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
}

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  // Reviewers cannot finalize approvals
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { user: null, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user, res: null };
}

async function loadCycleGrants(cycleId: string) {
  return fetchAllPages<GrantRow>((from, to) =>
    supabaseAdmin
      .from("grants")
      .select(`id, user_id, status, profiles:user_id (full_name, email)`)
      .eq("cycle_id", cycleId)
      .order("id", { ascending: true })
      .range(from, to),
  );
}

async function loadEmailedLogs(cycleId: string) {
  return fetchAllPages<EmailLogRow>((from, to) =>
    supabaseAdmin
      .from("grant_email_log")
      .select("grant_id, email_type, status")
      .eq("cycle_id", cycleId)
      .in("status", [...EMAILED_LOG_STATUSES])
      .order("id", { ascending: true })
      .range(from, to),
  );
}

/** After finalization, statuses on the grants themselves say who was approved. */
function splitByStatus(grants: GrantRow[]) {
  const awarded = new Set<string>(AWARDED_STATUSES);
  return {
    approved: grants.filter((g) => awarded.has(g.status)),
    rejected: grants.filter((g) => g.status === "not_approved"),
  };
}

/**
 * GET — finalization + email status for the admin UI: whether the cycle is
 * finalized and how many applicants have no email record yet.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { res } = await requireAdmin();
  if (res) return res;
  const { id: cycleId } = await params;

  const { data: cycle } = await supabaseAdmin
    .from("grant_cycles")
    .select("id, final_approved_at")
    .eq("id", cycleId)
    .single();
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  if (!cycle.final_approved_at) {
    return NextResponse.json({ finalized: false, pending: { approved: 0, rejected: 0 } });
  }

  const [grantsRes, logsRes] = await Promise.all([loadCycleGrants(cycleId), loadEmailedLogs(cycleId)]);
  if (grantsRes.error || logsRes.error) {
    return NextResponse.json({ error: "Could not load email status" }, { status: 500 });
  }
  const emailed = emailedSet(logsRes.data);
  const { approved, rejected } = splitByStatus(grantsRes.data);
  return NextResponse.json({
    finalized: true,
    final_approved_at: cycle.final_approved_at,
    pending: {
      approved: pendingFor(approved, "approved", emailed).length,
      rejected: pendingFor(rejected, "rejected", emailed).length,
    },
  });
}

/**
 * POST — finalize a cycle, then email applicants.
 *
 * Body `{ resume: "approved" | "rejected" }` (only valid once the cycle is
 * finalized) skips the decision phase and emails only applicants of that one
 * type with no email record. One type per call, so fixing a winner's email
 * can never re-send rejections too. It is an explicit, confirmed admin action:
 * if records are missing because logging was cut off (rather than sends),
 * confirm in Resend and backfill first.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, res } = await requireAdmin();
    if (res) return res;

    const { id: cycleId } = await params;
    const body = await request.json().catch(() => ({}));
    if (body?.resume !== undefined && body.resume !== "approved" && body.resume !== "rejected") {
      return NextResponse.json({ error: 'resume must be "approved" or "rejected"' }, { status: 400 });
    }
    const resumeType: "approved" | "rejected" | null = body?.resume ?? null;
    const resume = resumeType !== null;

    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("*, grant_tentative_approvals(grant_id, is_approved, combined_score)")
      .eq("id", cycleId)
      .single();

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    if (cycle.final_approved_at && !resume) {
      return NextResponse.json(
        { error: "This cycle has already been finalized.", finalized: true },
        { status: 400 },
      );
    }
    if (!cycle.final_approved_at && resume) {
      return NextResponse.json({ error: "This cycle has not been finalized yet." }, { status: 400 });
    }

    let approvedGrants: GrantRow[];
    let rejectedGrants: GrantRow[];

    if (!resume) {
      // ---------------- Phase 1: decide ----------------

      // Random-draw cycles: the confirmed winners ARE the approvals. Refuse to
      // finalize while any winner is unconfirmed or a replacement is owed, then
      // rewrite grant_tentative_approvals from the confirmed draws.
      if (cycle.selection_method === "random") {
        const { ctx, error: ctxError } = await loadDrawContext(supabaseAdmin, cycleId);
        if (!ctx) {
          return NextResponse.json({ error: ctxError }, { status: 500 });
        }
        const blocker = finalizeBlocker(ctx.summary);
        if (blocker) {
          return NextResponse.json({ error: blocker }, { status: 400 });
        }
        const confirmedIds = ctx.draws.filter((d) => d.status === "confirmed").map((d) => d.grant_id);
        const syncError = await syncTentativeApprovalsFromDraws(supabaseAdmin, cycleId, confirmedIds, user!.id);
        if (syncError) {
          return NextResponse.json({ error: syncError }, { status: 500 });
        }
        cycle.grant_tentative_approvals = confirmedIds.map((grantId) => ({
          grant_id: grantId,
          is_approved: true,
          combined_score: null,
        }));
      }

      if (!cycle.grant_tentative_approvals || cycle.grant_tentative_approvals.length === 0) {
        return NextResponse.json({ error: "No tentative approvals found" }, { status: 400 });
      }

      const grantsRes = await loadCycleGrants(cycleId);
      if (grantsRes.error) {
        return NextResponse.json({ error: "Could not load applications" }, { status: 500 });
      }

      const approvedIds = new Set<string>(
        cycle.grant_tentative_approvals
          .filter((t: { is_approved: boolean }) => t.is_approved)
          .map((t: { grant_id: string }) => t.grant_id),
      );
      approvedGrants = grantsRes.data.filter((g) => approvedIds.has(g.id));
      rejectedGrants = grantsRes.data.filter((g) => !approvedIds.has(g.id));

      // Bulk status writes (was one UPDATE per grant). Stop before stamping
      // final_approved_at if any write fails, so a re-run redoes this phase.
      for (const ids of idChunks(approvedGrants.map((g) => g.id))) {
        const { error } = await supabaseAdmin
          .from("grants")
          .update({ status: "approved", amount_approved: cycle.amount_per_grant })
          .in("id", ids);
        if (error) {
          console.error("[final-approve] approved status update failed:", error);
          return NextResponse.json({ error: "Could not update approved applications. Nothing was emailed; please try again." }, { status: 500 });
        }
      }
      for (const ids of idChunks(rejectedGrants.map((g) => g.id))) {
        const { error } = await supabaseAdmin.from("grants").update({ status: "not_approved" }).in("id", ids);
        if (error) {
          console.error("[final-approve] not_approved status update failed:", error);
          return NextResponse.json({ error: "Could not update applications. Nothing was emailed; please try again." }, { status: 500 });
        }
      }

      // Conditional stamp = the lock. If two finalize requests overlap (a
      // double click, a retry after "Failed to fetch"), both may write the
      // same statuses above (harmless), but only the one that flips
      // final_approved_at from null goes on to send email.
      const { data: stamped, error: stampError } = await supabaseAdmin
        .from("grant_cycles")
        .update({ final_approved_at: new Date().toISOString() })
        .eq("id", cycleId)
        .is("final_approved_at", null)
        .select("id");
      if (stampError) {
        console.error("[final-approve] final_approved_at stamp failed:", stampError);
        return NextResponse.json({ error: "Could not mark the cycle finalized. Nothing was emailed; please try again." }, { status: 500 });
      }
      if (!stamped || stamped.length === 0) {
        return NextResponse.json(
          { error: "This cycle was just finalized by another request. Refresh to see the result.", finalized: true },
          { status: 409 },
        );
      }

      // Mobile push notifications (fire-and-forget; emails remain the primary channel)
      {
        const { notifyGrantStatus } = await import("@/lib/push");
        const amountLabel = `$${Number(cycle.amount_per_grant).toLocaleString()}`;
        for (const grant of approvedGrants) {
          void notifyGrantStatus({ userId: grant.user_id, grantId: grant.id, status: "approved", cycleName: cycle.cycle_name, amount: amountLabel });
        }
        for (const grant of rejectedGrants) {
          void notifyGrantStatus({ userId: grant.user_id, grantId: grant.id, status: "not_approved", cycleName: cycle.cycle_name });
        }
      }
    } else {
      // Resume: decisions are already written to the grants.
      const grantsRes = await loadCycleGrants(cycleId);
      if (grantsRes.error) {
        return NextResponse.json({ error: "Could not load applications" }, { status: 500 });
      }
      ({ approved: approvedGrants, rejected: rejectedGrants } = splitByStatus(grantsRes.data));
    }

    // ---------------- Phase 2: notify (only those not yet emailed) ----------------
    const logsRes = await loadEmailedLogs(cycleId);
    if (logsRes.error) {
      return NextResponse.json(
        { error: "The cycle is finalized, but email records could not be loaded, so no emails were sent. Please try again.", finalized: true },
        { status: 500 },
      );
    }
    const emailed = emailedSet(logsRes.data);
    // On resume, only the requested type is sent.
    const approvedPending = resumeType === "rejected" ? [] : pendingFor(approvedGrants, "approved", emailed);
    const rejectedPending = resumeType === "approved" ? [] : pendingFor(rejectedGrants, "rejected", emailed);
    const skippedAlreadyEmailed =
      (resumeType === "rejected" ? 0 : approvedGrants.length - approvedPending.length) +
      (resumeType === "approved" ? 0 : rejectedGrants.length - rejectedPending.length);

    // Winners: individual sends, each logged immediately.
    let approvedSent = 0;
    let approvedFailed = 0;
    const approvedFailedEmails: string[] = [];
    for (const grant of approvedPending) {
      const profile = profileOf(grant);
      if (!profile?.email) continue;
      let result: { success: boolean; resendId?: string; error?: string };
      try {
        result = await sendGrantApprovedEmail({
          to: profile.email,
          name: profile.full_name || "there",
          grantCycleName: cycle.cycle_name,
          amount: cycle.amount_per_grant,
          ctaUrl: `https://nationalfundforwomen.org/grants/view/${grant.id}`,
        });
      } catch (err: unknown) {
        result = { success: false, error: err instanceof Error ? err.message : "Unknown error" };
      }
      const { error: logError } = await supabaseAdmin.from("grant_email_log").insert({
        grant_id: grant.id,
        cycle_id: cycleId,
        email_type: "approved",
        recipient_email: profile.email,
        status: result.success ? "sent" : "failed",
        resend_email_id: result.resendId,
        error_message: result.error,
      });
      if (logError) console.error("[final-approve] approved log insert failed:", grant.id, logError);
      if (result.success) approvedSent++;
      else {
        approvedFailed++;
        approvedFailedEmails.push(profile.email);
      }
    }

    // Everyone else: batched sends, logged per batch as they go.
    const baseVariables: Record<string, string> = {
      grantCycleName: cycle.cycle_name,
      ctaUrl: "https://nationalfundforwomen.org/grants/my-applications",
    };
    const rejectionBody = renderRejectionBody(
      (cycle.rejection_body as unknown) as Parameters<typeof renderRejectionBody>[0],
      baseVariables,
    );
    const rejectedRecipients = rejectedPending.flatMap((g) => {
      const profile = profileOf(g);
      if (!profile?.email) return [];
      return [{
        email: profile.email,
        name: profile.full_name || "there",
        grantId: g.id,
        variables: { ...baseVariables, body: rejectionBody },
      }];
    });

    const batchResult = await sendChunkedBatchEmails({
      recipients: rejectedRecipients,
      templateSlug: "grant-not-approved",
      idempotencyPrefix: `final-approve:${cycleId}:rejected`,
      onChunk: async (results) => {
        const { error } = await supabaseAdmin.from("grant_email_log").insert(
          results.map((r) => ({
            grant_id: r.recipient.grantId,
            cycle_id: cycleId,
            email_type: "rejected",
            recipient_email: r.email,
            status: r.success ? "sent" : "failed",
            resend_email_id: r.resendId,
            error_message: r.error,
          })),
        );
        if (error) console.error("[final-approve] rejected log insert failed:", error);
      },
    });

    return NextResponse.json({
      success: true,
      resumed: resumeType,
      skipped_already_emailed: skippedAlreadyEmailed,
      approved: {
        sent: approvedSent,
        failed: approvedFailed,
        failed_emails: approvedFailedEmails,
      },
      rejected: {
        sent: batchResult.sent,
        failed: batchResult.failed,
        failed_emails: batchResult.results.filter((r) => !r.success).map((r) => r.email),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
