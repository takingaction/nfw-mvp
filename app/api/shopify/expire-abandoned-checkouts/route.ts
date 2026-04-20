import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { days = 7 } = await request.json().catch(() => ({ days: 7 }));

    // Expire abandoned claims
    const { data: expiredClaims, error: expireError } = await supabaseAdmin
      .rpc("expire_abandoned_claims", { days_old: days });

    if (expireError) {
      console.error("Error expiring claims:", expireError);
      return NextResponse.json(
        { error: `Failed to expire claims: ${expireError.message}` },
        { status: 500 }
      );
    }

    // Clean up monthly_claims for expired claims
    const { data: cleanedMonthly, error: cleanupError } = await supabaseAdmin
      .rpc("cleanup_monthly_claims_for_expired");

    if (cleanupError) {
      console.error("Error cleaning up monthly_claims:", cleanupError);
    }

    const expiredCount = expiredClaims || 0;
    const cleanedCount = cleanedMonthly || 0;

    console.log(`Expired ${expiredCount} abandoned claims, cleaned ${cleanedCount} monthly_claims entries`);

    return NextResponse.json({
      expired: expiredCount,
      cleanedMonthly: cleanedCount,
      message: `Expired ${expiredCount} claims older than ${days} days`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in expire-abandoned-checkouts:", message);
    return NextResponse.json(
      { error: `Failed: ${message}` },
      { status: 500 }
    );
  }
}

// Also allow GET for manual triggering (e.g., via browser)
export async function GET() {
  return POST(new Request("http://localhost", { method: "POST" }));
}