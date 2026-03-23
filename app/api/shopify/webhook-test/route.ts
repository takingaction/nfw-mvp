import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const timestamp = new Date().toISOString();
    
    console.log("Webhook test received:", body);
    
    const { error: logError } = await supabaseAdmin
      .from("zero_dollar_claims")
      .insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        shopify_product_id: `webhook_test_${timestamp.replace(/[:.]/g, '-')}`,
        shopify_variant_id: "test_variant",
        status: "pending",
        shipping_address: { test: true, body: body.substring(0, 200) },
      });

    if (logError) {
      console.error("Failed to log webhook test:", logError);
      return NextResponse.json({ error: "Logging failed", details: logError.message }, { status: 500 });
    }

    return NextResponse.json({ received: true, logged: true, timestamp });
  } catch (error) {
    console.error("Webhook test error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Webhook test endpoint. Use POST to test." });
}
