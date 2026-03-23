import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const timestamp = new Date().toISOString();
    
    // Write a test log to a simple text file approach using Supabase
    const { error: logError } = await supabaseAdmin
      .from("zero_dollar_claims")
      .insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        shopify_product_id: `test_${timestamp}`,
        shopify_variant_id: "test_variant",
        status: "pending",
        shipping_address: { test: true, timestamp },
      });

    if (logError) {
      return NextResponse.json({ 
        error: "Database write failed", 
        details: logError.message,
        timestamp 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Webhook test endpoint working",
      timestamp 
    });
  } catch (error) {
    console.error("Webhook test error:", error);
    return NextResponse.json({ 
      error: "Test failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
