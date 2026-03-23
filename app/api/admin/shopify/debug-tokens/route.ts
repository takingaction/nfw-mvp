import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get ALL tokens from the table
    const { data: tokens, error } = await supabase
      .from("shopify_tokens")
      .select("id, shop, access_token, created_at, updated_at");

    if (error) {
      return NextResponse.json({ error: error.message, details: error });
    }

    return NextResponse.json({ 
      count: tokens?.length || 0,
      tokens: tokens?.map(t => ({
        ...t,
        // Mask the access_token for security
        access_token: t.access_token ? `${t.access_token.substring(0, 10)}...` : null
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
