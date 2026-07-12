import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      cycle_id,
      who_are_you,
      biggest_challenge,
      fund_usage,
      is_nominating,
      nominee_name,
      nominee_email,
      certification_consent,
    } = body;

    if (!cycle_id || !isValidUUID(cycle_id)) {
      return NextResponse.json(
        { error: "Invalid cycle ID" },
        { status: 400 },
      );
    }

    // Validate nominee fields when nominating
    if (is_nominating) {
      if (!nominee_name || typeof nominee_name !== "string" || nominee_name.trim().length < 1) {
        return NextResponse.json(
          { error: "Please provide the nominee's name" },
          { status: 400 },
        );
      }
      if (!nominee_email || typeof nominee_email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nominee_email.trim())) {
        return NextResponse.json(
          { error: "Please provide a valid nominee email address" },
          { status: 400 },
        );
      }
    }

    if (!who_are_you || typeof who_are_you !== "string" || who_are_you.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide a description of at least 10 characters" },
        { status: 400 },
      );
    }

    if (!biggest_challenge || typeof biggest_challenge !== "string" || biggest_challenge.trim().length < 10) {
      return NextResponse.json(
        { error: "Please describe your challenge in at least 10 characters" },
        { status: 400 },
      );
    }

    if (!fund_usage || typeof fund_usage !== "string" || fund_usage.trim().length < 10) {
      return NextResponse.json(
        { error: "Please describe fund usage in at least 10 characters" },
        { status: 400 },
      );
    }

    const { data: cycleData } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, status, is_testing_only")
      .eq("id", cycle_id)
      .single();

    if (!cycleData) {
      return NextResponse.json(
        { error: "Grant cycle not found" },
        { status: 404 },
      );
    }

    if (cycleData.status !== "open") {
      return NextResponse.json(
        { error: "This grant cycle is not accepting applications" },
        { status: 400 },
      );
    }

    // Defense-in-depth: prevent non-admins from applying to testing-only cycles
    if (cycleData.is_testing_only) {
      // Check if user is admin
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.json(
          { error: "This grant cycle is not available" },
          { status: 403 },
        );
      }
      // Admins can apply to testing-only cycles for testing purposes
    }

    // For self-applications, check if user already applied as themselves
    // Allow unlimited nominations per cycle
    if (!is_nominating) {
      const { data: existing } = await supabaseAdmin
        .from("grants")
        .select("id")
        .eq("user_id", user.id)
        .eq("cycle_id", cycle_id)
        .eq("is_nominating", false)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "You have already applied for this grant cycle." },
          { status: 409 },
        );
      }
    }
    // For nominations, allow unlimited - no duplicate check needed

    const { data: grant, error } = await supabaseAdmin
      .from("grants")
      .insert({
        user_id: user.id,
        cycle_id,
        who_are_you: who_are_you.trim(),
        biggest_challenge: biggest_challenge.trim(),
        fund_usage: fund_usage.trim(),
        is_nominating: Boolean(is_nominating),
        nominee_name: is_nominating ? nominee_name.trim() : null,
        nominee_email: is_nominating ? nominee_email.trim() : null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        consent_version: "v1",
        consent_given_at: new Date().toISOString(),
        certification_consent: Boolean(certification_consent),
      })
      .select()
      .single();

    if (error) {
      console.error("[grants/create] Supabase error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      console.error("[grants/create] Insert payload:", {
        user_id: user.id,
        cycle_id,
        is_nominating,
        nominee_name: is_nominating ? nominee_name.trim() : null,
        nominee_email: is_nominating ? nominee_email.trim() : null,
        status: "submitted",
      });
      return NextResponse.json(
        { error: error.message || "Failed to submit grant application" },
        { status: 500 },
      );
    }

    // Fetch user email and profile for the confirmation email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user.id);

    if (profile && userData?.user?.email) {
      // Fetch grant cycle name
      const { data: cycle } = await supabaseAdmin
        .from("grant_cycles")
        .select("cycle_name")
        .eq("id", cycle_id)
        .single();

      // Fire-and-forget email - don't block the response
      import("@/lib/email").then(({ sendGrantApplicationReceivedEmail }) => {
        sendGrantApplicationReceivedEmail({
          to: userData.user!.email!,
          name: profile.full_name || "there",
          grantCycleName: cycle?.cycle_name || "the grant",
          applicationId: grant.id,
        }).catch(console.error);
      });
    }

    return NextResponse.json({ success: true, grantId: grant.id });
  } catch (err) {
    console.error("[grants/create] Unexpected error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 },
    );
  }
}
