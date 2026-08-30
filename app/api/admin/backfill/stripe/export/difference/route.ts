import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Admin auth check
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tier = searchParams.get("tier") || "contributing"; // contributing or founding
    const direction = searchParams.get("direction") || "stripe"; // stripe or db (who's missing)

    const amount = tier === "contributing" ? 15 : 100;

    // Get Stripe Live emails
    let hasMore = true;
    let cursor;
    const stripeEmails = new Set<string>();

    while (hasMore) {
      const params: { limit: number; starting_after?: string; status: "active" } = {
        limit: 100,
        status: "active",
      };
      if (cursor) params.starting_after = cursor;

      const response = await stripe.subscriptions.list(params as any);

      for (const sub of response.data) {
        const priceAmount = sub.items.data[0]?.price?.unit_amount;
        if ((tier === "contributing" && priceAmount === 1500) ||
            (tier === "founding" && priceAmount === 10000)) {
          const email = (sub as any).email;
          if (email) stripeEmails.add(email.toLowerCase());
        }
      }

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        cursor = response.data[response.data.length - 1].id;
      }
      await new Promise(r => setTimeout(r, 25));
    }

    // Get Our DB emails (unique users with this tier's payment amount)
    const { data: payments } = await supabase
      .from("membership_payments")
      .select(`
        user_id,
        profiles!inner(email)
      `)
      .eq("amount", amount);

    const dbEmails = new Set<string>();
    for (const p of payments || []) {
      const email = (p.profiles as any)?.email;
      if (email) dbEmails.add(email.toLowerCase());
    }

    // Find difference
    const missingInDb: string[] = [];
    const missingInStripe: string[] = [];

    for (const email of stripeEmails) {
      if (!dbEmails.has(email)) {
        missingInDb.push(email);
      }
    }

    for (const email of dbEmails) {
      if (!stripeEmails.has(email)) {
        missingInStripe.push(email);
      }
    }

    // Build CSV based on direction
    const csvRows: string[] = [];
    if (direction === "stripe") {
      // Members in Stripe but not in Our DB
      csvRows.push("Email");
      for (const email of missingInDb.sort()) {
        csvRows.push(`"${email}"`);
      }
    } else {
      // Members in Our DB but not in Stripe
      csvRows.push("Email");
      for (const email of missingInStripe.sort()) {
        csvRows.push(`"${email}"`);
      }
    }

    const csv = csvRows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="difference-${tier}-${direction}.csv"`,
      },
    });

  } catch (error: any) {
    console.error("[export-difference] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export" },
      { status: 500 }
    );
  }
}