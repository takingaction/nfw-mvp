import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function GET(
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
      .select("*, grant_tentative_approvals(grant_id, is_approved)")
      .eq("id", cycleId)
      .single();

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // Get all grants to check completion status
    const { data: grantsCheck } = await supabaseAdmin
      .from("grants")
      .select("id, rachel_complete, michelle_complete, grant_scores (reviewer_name, total_score, needs_discussion)")
      .eq("cycle_id", cycleId);

    if (!grantsCheck || grantsCheck.length === 0) {
      return NextResponse.json({ error: "No grants found" }, { status: 404 });
    }

    // Check if first review is complete
    const allFirstComplete = grantsCheck.every((g) => g.rachel_complete === true);

    if (!allFirstComplete) {
      return NextResponse.json({
        error: "First review is not complete. Please complete all first reviews first."
      }, { status: 400 });
    }

    // Get grants in scope for second review (first score >= 7 OR first flagged)
    const grantsInScope = grantsCheck.filter((g: any) => {
      if (!g.rachel_complete) return false;
      const firstScore = g.grant_scores?.find((s: any) => s.reviewer_name === "first");
      if (!firstScore) return false;
      const totalScore = firstScore.total_score || 0;
      const wasFlagged = firstScore.needs_discussion === true;
      return totalScore >= 7 || wasFlagged;
    });

    // Second review is complete if all grants in scope have michelle_complete = true
    const allSecondComplete = grantsInScope.length === 0
      ? true
      : grantsInScope.every((g: any) => g.michelle_complete === true);

    if (!allSecondComplete) {
      return NextResponse.json({
        error: "Second review is not complete. Please complete all second reviews first."
      }, { status: 400 });
    }

    // Get all grants with all scores (no FK join for documents)
    const { data: grants } = await supabaseAdmin
      .from("grants")
      .select(`
        id,
        user_id,
        who_are_you,
        biggest_challenge,
        fund_usage,
        is_nominating,
        nominee_name,
        nominee_email,
        status,
        submitted_at,
        stripe_connect_account_id,
        funded_at,
        transfer_id,
        profiles:user_id (full_name, email, city, state, stripe_onboarding_completed, stripe_connect_account_id),
        grant_scores (reviewer_name, urgency_score, authenticity_score, impact_score, barriers_yn, needs_discussion, discussion_notes, total_score),
        amount_approved
      `)
      .eq("cycle_id", cycleId)
      .order("submitted_at", { ascending: false });

    // Fetch documents manually for these grants
    const grantIds = grants?.map((g) => g.id) || [];
    let documentsByGrant: Record<string, any[]> = {};
    if (grantIds.length > 0) {
      const { data: allDocs } = await supabaseAdmin
        .from("grant_documents")
        .select("id, file_name, file_size, uploaded_at, document_url, grant_id")
        .in("grant_id", grantIds);
      
      documentsByGrant = (allDocs || []).reduce((acc: Record<string, any[]>, doc: any) => {
        if (!acc[doc.grant_id]) acc[doc.grant_id] = [];
        acc[doc.grant_id].push(doc);
        return acc;
      }, {});
    }

    // Calculate applications per user for grants ending in the same month
    let applicationsThisMonth: Record<string, number> = {};
    let totalAvailableGrants = 0;

    if (cycle?.end_date) {
      const endDate = new Date(cycle.end_date);
      const monthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      const monthEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);

      // Find all non-testing cycles ending in the same month
      const { data: cyclesInMonth } = await supabaseAdmin
        .from("grant_cycles")
        .select("id")
        .gte("end_date", monthStart.toISOString().split('T')[0])
        .lte("end_date", monthEnd.toISOString().split('T')[0])
        .eq("is_testing_only", false);

      const cycleIds = cyclesInMonth?.map((c: any) => c.id) || [];
      totalAvailableGrants = cycleIds.length;

      if (cycleIds.length > 0) {
        // Count applications per user for those cycles
        const { data: allGrantsInMonth } = await supabaseAdmin
          .from("grants")
          .select("user_id")
          .in("cycle_id", cycleIds);

        applicationsThisMonth = (allGrantsInMonth || []).reduce((acc: Record<string, number>, g: any) => {
          if (g.user_id) {
            acc[g.user_id] = (acc[g.user_id] || 0) + 1;
          }
          return acc;
        }, {});
      }
    }

    // Filter to only grants in scope for second review (first score >= 7 OR first flagged)
    const grantsForDisplay = grants?.filter((g: any) => {
      const firstScore = g.grant_scores?.find((s: any) => s.reviewer_name === "first");
      if (!firstScore) return false;
      const totalScore = firstScore.total_score || 0;
      const wasFlagged = firstScore.needs_discussion === true;
      return totalScore >= 7 || wasFlagged;
    }) || [];

    // Combine scores and calculate combined totals
    const grantsWithCombinedScores = grantsForDisplay.map((g) => {
      const firstScore = g.grant_scores?.find((s: any) => s.reviewer_name === "first");
      const secondScore = g.grant_scores?.find((s: any) => s.reviewer_name === "second");

      const firstTotal = firstScore?.total_score || 0;
      const secondTotal = secondScore?.total_score || 0;
      const combinedScore = firstTotal + secondTotal;

      // Determine decision band
      let decision = "Not Approved";
      if (combinedScore >= 14) {
        decision = "Approved";
      } else if (combinedScore >= 8) {
        decision = "Runner Up";
      }

      return {
        ...g,
        first_score: firstScore || null,
        second_score: secondScore || null,
        combined_score: combinedScore,
        decision,
        needs_discussion: firstScore?.needs_discussion || false,
        discussion_notes: firstScore?.discussion_notes || null,
        second_needs_discussion: secondScore?.needs_discussion || false,
        second_discussion_notes: secondScore?.discussion_notes || null,
        barriers_yn: firstScore?.barriers_yn || null,
        is_tentatively_approved: cycle.grant_tentative_approvals?.some(
          (t: any) => t.grant_id === g.id && t.is_approved
        ) || false,
        stripe_connect_account_id: g.stripe_connect_account_id || null,
        funded_at: g.funded_at || null,
        transfer_id: g.transfer_id || null,
        stripe_onboarding_completed: (Array.isArray(g.profiles) ? g.profiles[0] : g.profiles)?.stripe_onboarding_completed ?? false,
        profiles: (Array.isArray(g.profiles) ? g.profiles[0] : g.profiles) || null,
        amount_approved: g.amount_approved || null,
        applications_this_month: applicationsThisMonth[g.user_id] || 1,
        total_available_grants: totalAvailableGrants,
        documents: documentsByGrant[g.id] || [],
      };
    }) || [];

    // Fetch Stripe Connect account names for grants with funded accounts
    const stripeAccountIds = [...new Set(
      grantsWithCombinedScores
        .filter((g: any) => g.stripe_connect_account_id && g.funded_at)
        .map((g: any) => g.stripe_connect_account_id)
    )];

    const stripeAccounts: Record<string, string> = {};
    for (const grant of grantsWithCombinedScores) {
      const accountId = grant.stripe_connect_account_id;
      if (!accountId || !grant.funded_at) continue;

      try {
        const account = await stripe.accounts.retrieve(accountId);
        const name =
          (account.business_profile as any)?.name ||
          ((account.individual as any)?.first_name && (account.individual as any)?.last_name
            ? `${(account.individual as any).first_name} ${(account.individual as any).last_name}`
            : (account.individual as any)?.name) ||
          account.email ||
          null;
        stripeAccounts[accountId] = name;
      } catch (e) {
        // Fall back to member's name from profiles table
        stripeAccounts[accountId] = (grant.profiles as any)?.full_name || null;
      }
    }

    // Add connect_account_name to each grant
    grantsWithCombinedScores.forEach((g: any) => {
      if (g.stripe_connect_account_id) {
        // Use Stripe account name if available, otherwise fall back to profile name or null
        g.connect_account_name = stripeAccounts[g.stripe_connect_account_id] || null;
      } else {
        g.connect_account_name = null;
      }
    });

    // Calculate total paid (sum of amount_approved where funded_at IS NOT NULL)
    const totalPaid = grantsWithCombinedScores
      .filter((g: any) => g.funded_at && g.amount_approved)
      .reduce((sum: number, g: any) => sum + Number(g.amount_approved), 0);

    // Check for previous grants for each user
    const userIds = [...new Set(grantsForDisplay.map((g: any) => g.user_id).filter(Boolean))];
    let previousGrantsByUser: Record<string, boolean> = {};

    if (userIds.length > 0) {
      const { data: previousGrants } = await supabaseAdmin
        .from("grants")
        .select("user_id")
        .in("user_id", userIds)
        .eq("status", "payment_sent")
        .neq("cycle_id", cycleId); // Exclude current cycle

      previousGrantsByUser = (previousGrants || []).reduce((acc: Record<string, boolean>, g: any) => {
        acc[g.user_id] = true;
        return acc;
      }, {});
    }

    // Add previous grant flag to each grant
    grantsWithCombinedScores.forEach((g: any) => {
      g.has_received_grant = previousGrantsByUser[g.user_id] || false;
    });

    // Sort by combined score descending
    grantsWithCombinedScores.sort((a, b) => b.combined_score - a.combined_score);

    // Add rank
    grantsWithCombinedScores.forEach((g: any, index: number) => {
      g.rank = index + 1;
    });

    return NextResponse.json({
      grants: grantsWithCombinedScores,
      cycle: {
        id: cycle.id,
        cycle_name: cycle.cycle_name,
        amount_per_grant: cycle.amount_per_grant,
        grants_available: cycle.grants_available,
        total_funds: cycle.total_funds,
        scoring_completed_at: cycle.scoring_completed_at,
        final_approved_at: cycle.final_approved_at,
        is_finalized: cycle.is_finalized,
      },
      totalPaid,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
