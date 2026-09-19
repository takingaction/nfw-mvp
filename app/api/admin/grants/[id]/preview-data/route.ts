import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getPreRenderedHtmlAdmin } from "@/lib/email-blocks/publish";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: cycleId } = await params;

    // Applicants on this cycle, joined with profile for name+email.
    // Status-agnostic: the modal previews the rejection email using the
    // cycle's actual rejection_message values; the chosen applicant's
    // status is irrelevant (we only borrow their name for {{name}}).
    // `profiles` is FK on grants.user_id → profiles.id.
    const { data: applicants, error: applicantsError } = await supabaseAdmin
      .from("grants")
      .select("id, status, profiles:user_id(full_name, email)")
      .eq("cycle_id", cycleId)
      .order("created_at", { ascending: true });

    if (applicantsError) {
      console.error(
        "[preview-data] Failed to fetch applicants:",
        applicantsError,
      );
      return NextResponse.json(
        { error: "Failed to fetch applicants" },
        { status: 500 },
      );
    }

    const applicantList = (applicants || []).map((g: any) => {
      const profile = Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
      return {
        id: g.id,
        status: g.status,
        name: profile?.full_name || "Unknown applicant",
        email: profile?.email || "",
      };
    });

    // Compute the rendered subject line for the "grant-not-approved" template.
    // Subject doesn't depend on variable values for this template, so any
    // placeholder values work — we just need the rendered subject string to
    // show the admin what will be sent.
    const preRendered = await getPreRenderedHtmlAdmin(
      "grant-not-approved",
      {
        grantCycleName: "",
        rejectionMessage: "",
        rejectionMessage1: "",
        rejectionMessage2: "",
        rejectionMessage3: "",
        ctaUrl: "",
      },
      { skipActiveCheck: true },
    );

    const subjectPreview = preRendered?.subject || "";

    return NextResponse.json({
      applicants: applicantList,
      subjectPreview,
      adminEmail: user.email || "",
    });
  } catch (err: any) {
    console.error("[preview-data] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
