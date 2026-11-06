import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";
import { checkDeletionEligibility } from "@/lib/deletion-eligibility";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending, verified, processed, cancelled

    let query = supabaseAdmin
      .from("deletion_requests")
      .select(`
        *,
        profile:profiles!deletion_requests_user_id_fkey(
          id,
          full_name,
          email,
          membership_level,
          subscription_status
        )
      `)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[admin/deletion-requests] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch deletion requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests: data || [] });
  } catch (error: any) {
    console.error("[admin/deletion-requests] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

const REQUESTED_VIA = ["email", "freshdesk", "phone", "other"] as const;
type RequestedVia = (typeof REQUESTED_VIA)[number];

/**
 * Admin opens a deletion request on a member's behalf, because the member asked
 * through support rather than the self-serve button. The row is marked
 * source = 'admin' with the channel, ticket and note, so the audit trail shows
 * the member asked and an admin entered it.
 *
 * The request is recorded even if deletion is currently blocked (e.g. a renewing
 * subscription), so the date the member asked is preserved; Verify enforces
 * eligibility before anything is deleted.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized || !admin.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const adminUserId = admin.user.id;

    const body = await request.json().catch(() => null);
    const memberId: unknown = body?.memberId;
    const requestedVia: unknown = body?.requestedVia;
    const ticketNumber: string | null =
      typeof body?.ticketNumber === "string" && body.ticketNumber.trim() ? body.ticketNumber.trim() : null;
    const notes: string = typeof body?.notes === "string" ? body.notes.trim() : "";
    const requestedAtRaw: unknown = body?.requestedAt;

    if (typeof memberId !== "string" || !memberId) {
      return NextResponse.json({ error: "Missing memberId" }, { status: 400 });
    }
    if (memberId === adminUserId) {
      return NextResponse.json({ error: "You can't open a deletion request for your own account here." }, { status: 400 });
    }
    if (typeof requestedVia !== "string" || !REQUESTED_VIA.includes(requestedVia as RequestedVia)) {
      return NextResponse.json({ error: "Choose how the member made the request." }, { status: 400 });
    }
    if (requestedVia === "freshdesk" && !ticketNumber) {
      return NextResponse.json({ error: "Enter the Freshdesk ticket number." }, { status: 400 });
    }
    if (notes.length < 10) {
      return NextResponse.json(
        { error: "Add a note describing the member's request (at least a sentence)." },
        { status: 400 }
      );
    }

    let requestedAt = new Date();
    if (typeof requestedAtRaw === "string" && requestedAtRaw) {
      const parsed = new Date(requestedAtRaw);
      if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now() + 5 * 60 * 1000) {
        return NextResponse.json({ error: "The request date can't be in the future." }, { status: 400 });
      }
      requestedAt = parsed;
    }

    const { data: member } = await supabaseAdmin
      .from("profiles")
      .select("id, email, deleted_at, is_admin")
      .eq("id", memberId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (member.deleted_at) {
      return NextResponse.json({ error: "This member has already been deleted." }, { status: 400 });
    }
    if (member.is_admin) {
      return NextResponse.json(
        { error: "This member is an admin. Remove their admin access before opening a deletion request." },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("deletion_requests")
      .select("id, status")
      .eq("user_id", memberId)
      .in("status", ["pending", "verified", "processing"])
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          error: "This member already has an open deletion request.",
          requestId: existing[0].id,
        },
        { status: 409 }
      );
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(memberId);
    const email = authUser?.user?.email || member.email || "";

    const { data: created, error: createError } = await supabaseAdmin
      .from("deletion_requests")
      .insert({
        user_id: memberId,
        email,
        status: "pending",
        source: "admin",
        requested_via: requestedVia,
        created_by: adminUserId,
        freshdesk_ticket_number: ticketNumber,
        requested_at: requestedAt.toISOString(),
        notes,
      })
      .select("id")
      .single();

    if (createError || !created) {
      console.error("[admin/deletion-requests] Create error:", createError);
      return NextResponse.json({ error: "Failed to create deletion request" }, { status: 500 });
    }

    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: created.id,
      user_id: memberId,
      action: "create_on_behalf",
      table_name: "deletion_requests",
      record_identifier: created.id,
      details: {
        requested_via: requestedVia,
        freshdesk_ticket_number: ticketNumber,
        requested_at: requestedAt.toISOString(),
      },
      performed_by: adminUserId,
    });

    const eligibility = await checkDeletionEligibility(memberId);

    return NextResponse.json({
      success: true,
      requestId: created.id,
      eligible: eligibility.eligible,
      blocks: eligibility.blocks.map((b) => ({ code: b.code, message: b.adminMessage })),
    });
  } catch (error: unknown) {
    console.error("[admin/deletion-requests] Create error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
