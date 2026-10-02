import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireGrantsAccess } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type Action = "skip" | "restore" | "validate" | "unvalidate";
const ACTIONS: Action[] = ["skip", "restore", "validate", "unvalidate"];

/**
 * Reviewer decisions on AI-flagged applications.
 *
 * - skip:       mark invalid. Does NOT change grants.status — the member keeps
 *               seeing "Submitted". The rejection (status + email + push) happens
 *               only at Finalize Approvals, which rejects every unchecked grant.
 *               Clears any prior "valid" mark.
 * - restore:    undo a skip.
 * - validate:   mark valid — clears the AI flag for badge/sort/count purposes.
 *               The AI's original verdict + reasoning are preserved. Clears any skip.
 * - unvalidate: undo a "valid" mark.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireGrantsAccess();
    if (!auth.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: cycleId } = await params;
    const body = await request.json();
    const { grantId, action } = body as { grantId?: string; action?: Action };

    if (!grantId || !action || !ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: "Missing or invalid grantId/action" },
        { status: 400 },
      );
    }

    const { data: grant, error: grantError } = await supabaseAdmin
      .from("grants")
      .select("id, status, cycle_id")
      .eq("id", grantId)
      .eq("cycle_id", cycleId)
      .single();

    if (grantError || !grant) {
      return NextResponse.json(
        { error: "Grant not found in this cycle" },
        { status: 404 },
      );
    }

    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("final_approved_at")
      .eq("id", cycleId)
      .maybeSingle();
    // Never touch grants.status once the cycle has been finalized — at that
    // point not_approved is the real outcome and emails have gone out.
    const canResetStatus =
      !cycle?.final_approved_at && grant.status === "not_approved";

    const now = new Date().toISOString();
    let update: Record<string, string | null>;

    switch (action) {
      case "skip":
        update = {
          ai_invalidated_at: now,
          ai_invalidated_by: auth.user.id,
          ai_validated_at: null,
          ai_validated_by: null,
        };
        break;
      case "restore":
        update = { ai_invalidated_at: null, ai_invalidated_by: null };
        // Legacy: pre-migration-200 skips set status to not_approved.
        if (canResetStatus) {
          update.status = "submitted";
          update.reviewed_at = null;
        }
        break;
      case "validate":
        update = {
          ai_validated_at: now,
          ai_validated_by: auth.user.id,
          ai_invalidated_at: null,
          ai_invalidated_by: null,
        };
        if (canResetStatus) {
          update.status = "submitted";
          update.reviewed_at = null;
        }
        break;
      case "unvalidate":
        update = { ai_validated_at: null, ai_validated_by: null };
        break;
    }

    const { error: updateError } = await supabaseAdmin
      .from("grants")
      .update(update)
      .eq("id", grantId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, action, grantId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
