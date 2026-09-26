import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resyncProfileNow } from "@/lib/flodesk-sync";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/waitlist/accept
 *
 * Marks a waitlist_acceptance_tokens row as used and upgrades the
 * associated profile from waitlist to free membership.
 *
 * Note: The email link points to /auth/accept-waitlist (a server component
 * page), not this endpoint. This API exists for admin visibility and any
 * future programmatic callers. The page calls this logic directly via the
 * service-role client so the user doesn't see a JSON response.
 *
 * Body: { token: string (uuid) }
 *
 * Returns:
 *   200 { success: true, userId }
 *   400 { error: "token_required" | "token_invalid" | "token_expired" | "token_used" | "already_member" }
 *   404 { error: "token_not_found" }
 *   500 { error: "..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const token = body?.token;

    if (!token) {
      return NextResponse.json(
        { error: "token_required" },
        { status: 400 },
      );
    }

    // Look up the token. Reject anything that isn't a live (unused, unprocessed)
    // token whose expiry hasn't passed.
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("waitlist_acceptance_tokens")
      .select("id, user_id, expires_at, used_at, expired_processed_at")
      .eq("id", token)
      .is("used_at", null)
      .is("expired_processed_at", null)
      .maybeSingle();

    if (tokenError) {
      console.error("[waitlist/accept] Token lookup error:", tokenError);
      return NextResponse.json(
        { error: "token_lookup_failed" },
        { status: 500 },
      );
    }

    if (!tokenRow) {
      // Either the token doesn't exist, was used, or was expired/processed.
      // The /auth/accept-waitlist page distinguishes these by doing a fuller
      // fetch. Here we collapse them into a single error.
      return NextResponse.json(
        { error: "token_not_found" },
        { status: 404 },
      );
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "token_expired" },
        { status: 400 },
      );
    }

    // Look up the profile to confirm they're still on the waitlist.
    // If they upgraded to contributing/founding between token creation and
    // acceptance, we refuse the downgrade (this matches the page logic).
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, membership_level, full_name, email")
      .eq("id", tokenRow.user_id)
      .maybeSingle();

    if (profileError) {
      console.error("[waitlist/accept] Profile lookup error:", profileError);
      return NextResponse.json(
        { error: "profile_lookup_failed" },
        { status: 500 },
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "profile_not_found" },
        { status: 404 },
      );
    }

    if (profile.membership_level !== "waitlist") {
      return NextResponse.json(
        { error: "already_member" },
        { status: 400 },
      );
    }

    // Atomic mark-token-used. Guard on used_at IS NULL prevents a race
    // between two simultaneous clicks.
    const { data: updatedToken, error: markError } = await supabaseAdmin
      .from("waitlist_acceptance_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();

    if (markError || !updatedToken) {
      console.error("[waitlist/accept] Failed to mark token used:", markError);
      return NextResponse.json(
        { error: "token_race_lost" },
        { status: 409 },
      );
    }

    // Upgrade profile to free membership.
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        membership_level: "free",
        is_approved_free_member: true,
        free_membership_contact_submitted: true,
        profile_completed: true,
        previous_membership_level: "waitlist",
        updated_at: new Date().toISOString(),
      })
      .eq("id", tokenRow.user_id);

    if (updateError) {
      // Compensating action: roll the token back to unused. Without this,
      // the member would be stuck — token marked used but profile not upgraded.
      await supabaseAdmin
        .from("waitlist_acceptance_tokens")
        .update({ used_at: null })
        .eq("id", tokenRow.id);
      console.error("[waitlist/accept] Profile upgrade failed:", updateError);
      return NextResponse.json(
        { error: "upgrade_failed" },
        { status: 500 },
      );
    }

    // Fire-and-forget: exit the Waitlist Flodesk segment. The hourly
    // sweep is the backstop if this fails.
    void resyncProfileNow(tokenRow.user_id);

    return NextResponse.json({
      success: true,
      userId: tokenRow.user_id,
    });
  } catch (err) {
    console.error("[waitlist/accept] Unexpected error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 },
    );
  }
}
