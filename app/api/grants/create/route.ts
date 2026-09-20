import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// 120s — was 15s but the inline AI eval (Promise.race with 6s timeout) was
// cutting things too tight when the submit handler also does cycle lookup,
// profile update, grant insert and document upload serially. 2026-09-20
// bump. The inline timeout itself is 16s now (lib/anthropic.ts aborts at
// 18s) so 120s leaves generous headroom for everything else.
export const maxDuration = 120;

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
      certification_consent,
    } = body;

    if (!cycle_id || !isValidUUID(cycle_id)) {
      return NextResponse.json(
        { error: "Invalid cycle ID" },
        { status: 400 },
      );
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

    if (!certification_consent) {
      return NextResponse.json(
        { error: "You must certify your eligibility to submit a grant application" },
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

    // Check if user already applied for this cycle
    const { data: existing } = await supabaseAdmin
      .from("grants")
      .select("id")
      .eq("user_id", user.id)
      .eq("cycle_id", cycle_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "You have already applied for this grant cycle." },
        { status: 409 },
      );
    }

    const { data: grant, error } = await supabaseAdmin
      .from("grants")
      .insert({
        user_id: user.id,
        cycle_id,
        who_are_you: who_are_you.trim(),
        biggest_challenge: biggest_challenge.trim(),
        fund_usage: fund_usage.trim(),
        is_nominating: false,
        nominee_name: null,
        nominee_email: null,
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
      // Fetch grant cycle name + description for AI evaluation and email
      const { data: cycle } = await supabaseAdmin
        .from("grant_cycles")
        .select("cycle_name, description")
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

      // Fire-and-forget AI relevance evaluation.
      //
      // Wrapped in a Promise.race against a 6 s wall-clock timer. Vercel
      // terminates serverless functions by aborting in-flight requests once
      // `maxDuration` (15 s) is reached, which surfaces as
      // APIUserAbortError("Request was aborted."). The race short-circuits
      // before Vercel kills us, so we can persist a clean 'not_evaluated'
      // state and let the /api/cron/ai-evaluate-pending backfill (every
      // 5 min) pick the row up.
      if (cycle) {
        import("@/lib/anthropic").then(
          ({ evaluateGrantApplication, AI_MODEL_VERSION }) => {
            const evaluationPromise = evaluateGrantApplication({
              cycleName: cycle.cycle_name || "",
              cycleDescription: cycle.description || "",
              whoAreYou: who_are_you.trim(),
              biggestChallenge: biggest_challenge.trim(),
              fundUsage: fund_usage.trim(),
            });
            // 16s — must stay under lib/anthropic.ts's TIMEOUT_MS (18s) so
            // the SDK's own AbortController doesn't fire first. Was 6s — too
            // tight, every Claude latency spike > 6s would silently mark the
            // app ai_relevance='uncertain' with reasoning "AI evaluation
            // timed out". Bumped 2026-09-20 to reduce false-positive timeouts.
            const timeoutMs = 16000;
            const timeoutPromise = new Promise<{
              relevance: "uncertain";
              reasoning: string;
              model: string;
              inputTokens: number;
              outputTokens: number;
            }>((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    relevance: "uncertain",
                    reasoning: "AI evaluation timed out",
                    model: AI_MODEL_VERSION,
                    inputTokens: 0,
                    outputTokens: 0,
                  }),
                timeoutMs,
              ),
            );

            Promise.race([evaluationPromise, timeoutPromise])
              .then(async (result) => {
                await supabaseAdmin
                  .from("grants")
                  .update({
                    ai_relevance: result.relevance,
                    ai_reasoning: result.reasoning,
                    ai_evaluated_at: new Date().toISOString(),
                    ai_model_version: result.model || AI_MODEL_VERSION,
                  })
                  .eq("id", grant.id);
              })
              .catch((err) => {
                console.error("[grants/create] AI eval error:", err);
              });
          },
        );
      }
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
