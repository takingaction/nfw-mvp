import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendGrantApprovedEmail } from "@/lib/email";
import { sendBatchEmails } from "@/lib/email-batch";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: cycleId } = await params;

    // Get cycle info
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("*, grant_tentative_approvals(grant_id, is_approved, combined_score)")
      .eq("id", cycleId)
      .single();

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    if (!cycle.grant_tentative_approvals || cycle.grant_tentative_approvals.length === 0) {
      return NextResponse.json({ error: "No tentative approvals found" }, { status: 400 });
    }

    // Get all grants with profiles
    const { data: allGrants } = await supabaseAdmin
      .from("grants")
      .select(`
        id,
        user_id,
        cycle_id,
        profiles:user_id (full_name, email)
      `)
      .eq("cycle_id", cycleId);

    // Separate into approved and not approved
    const approvedGrantIds = new Set(
      cycle.grant_tentative_approvals
        .filter((t: any) => t.is_approved)
        .map((t: any) => t.grant_id)
    );

    const approvedGrants = allGrants?.filter((g) => approvedGrantIds.has(g.id)) || [];
    const rejectedGrants = allGrants?.filter((g) => !approvedGrantIds.has(g.id)) || [];

    // Update approved grants - set status to 'approved' and add amount_approved
    for (const grant of approvedGrants) {
      await supabaseAdmin
        .from("grants")
        .update({
          status: "approved",
          amount_approved: cycle.amount_per_grant,
        })
        .eq("id", grant.id);
    }

    // Update rejected grants - set status to 'not_approved'
    for (const grant of rejectedGrants) {
      await supabaseAdmin
        .from("grants")
        .update({ status: "not_approved" })
        .eq("id", grant.id);
    }

    // Update cycle final_approved_at
    await supabaseAdmin
      .from("grant_cycles")
      .update({ final_approved_at: new Date().toISOString() })
      .eq("id", cycleId);

    // Send emails to approved grants
    for (const grant of approvedGrants) {
      const profile = Array.isArray(grant.profiles) ? grant.profiles[0] : grant.profiles;
      if (profile?.email) {
        await sendGrantApprovedEmail({
          to: profile.email,
          name: profile.full_name || "there",
          grantCycleName: cycle.cycle_name,
          amount: cycle.amount_per_grant,
          ctaUrl: `https://nationalfundforwomen.org/grants/view/${grant.id}`,
        });
      }
    }

    // Send batch emails to rejected grants (50 at a time)
    const rejectedRecipients = rejectedGrants
      .filter((g) => {
        const profile = Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
        return profile?.email;
      })
      .map((g) => {
        const profile = Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
        return {
          email: profile!.email!,
          name: profile!.full_name || "there",
          variables: {
            grantCycleName: cycle.cycle_name,
            ctaUrl: `https://nationalfundforwomen.org/grants/my-applications`,
          },
        };
      });

    if (rejectedRecipients.length > 0) {
      await sendBatchEmails({
        recipients: rejectedRecipients,
        templateSlug: "grant-not-approved",
      });
    }

    return NextResponse.json({
      success: true,
      approved_count: approvedGrants.length,
      rejected_count: rejectedGrants.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
