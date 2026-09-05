import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  // Get all successful membership payments with pagination
  const contributingUserIds = new Set<string>();
  const foundingUserIds = new Set<string>();
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = (page + 1) * pageSize - 1;
    console.log(`[our-db] Querying range ${from} to ${to}`);

    const { data: payments, error: paymentsError } = await supabase
      .from("membership_payments")
      .select("id, amount, user_id")
      .eq("status", "succeeded")
      .in("amount", [15, 100])
      .range(from, to);

    if (paymentsError) {
      console.error("[our-db] Payments query error:", paymentsError);
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    console.log(`[our-db] Page ${page}: got ${payments?.length || 0} records, hasMore=${payments?.length === pageSize}`);

    let pageContributing = 0;
    let pageFounding = 0;
    for (const p of payments || []) {
      if (p.amount === 15) {
        contributingUserIds.add(p.user_id);
        pageContributing++;
      } else if (p.amount === 100) {
        foundingUserIds.add(p.user_id);
        pageFounding++;
      }
    }
    console.log(`[our-db] Page ${page}: contributing=${pageContributing}, founding=${pageFounding}, totalSet=${contributingUserIds.size + foundingUserIds.size}`);

    hasMore = payments && payments.length === pageSize;
    page++;
  }

  console.log("[our-db] Final unique contributing:", contributingUserIds.size);
  console.log("[our-db] Final unique founding:", foundingUserIds.size);

  const dbContributingCount = contributingUserIds.size;
  const dbFoundingCount = foundingUserIds.size;
  const dbContributingTotal = dbContributingCount * 15;
  const dbFoundingTotal = dbFoundingCount * 100;

  return NextResponse.json({
    our_db: {
      contributing: { count: dbContributingCount, total: dbContributingTotal },
      founding: { count: dbFoundingCount, total: dbFoundingTotal },
      total: {
        count: dbContributingCount + dbFoundingCount,
        total: dbContributingTotal + dbFoundingTotal,
      },
    },
  });
}
