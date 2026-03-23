import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const data = JSON.parse(body);
    const timestamp = new Date().toISOString();
    
    console.log("Webhook test received:", body);
    
    // Find a real claim to update instead of inserting new
    const { data: claims, error: findError } = await supabaseAdmin
      .from("zero_dollar_claims")
      .select("id")
      .not("user_id", "is", null)
      .limit(1);

    if (findError || !claims || claims.length === 0) {
      return NextResponse.json({ error: "No claims found to test with" }, { status: 404 });
    }

    // Update the claim's shipping_address with our test data
    const { error: updateError } = await supabaseAdmin
      .from("zero_dollar_claims")
      .update({
        shipping_address: { webhook_test: true, timestamp, body: body.substring(0, 200) }
      })
      .eq("id", claims[0].id);

    if (updateError) {
      console.error("Failed to update claim:", updateError);
      return NextResponse.json({ error: "Update failed", details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ received: true, logged: true, timestamp, claimId: claims[0].id });
  } catch (error) {
    console.error("Webhook test error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Webhook test endpoint. Use POST to test." });
}
