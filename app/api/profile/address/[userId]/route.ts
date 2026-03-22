import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("full_name, address_line1, address_line2, city, state, zip")
      .eq("id", userId)
      .single();

    if (error || !profile || !profile.address_line1) {
      return NextResponse.json({ address: null });
    }

    const address = {
      full_name: profile.full_name || "",
      address_line1: profile.address_line1 || "",
      address_line2: profile.address_line2 || "",
      city: profile.city || "",
      state: profile.state || "",
      zip: profile.zip || "",
      country: "USA",
    };

    return NextResponse.json({ address });
  } catch (error) {
    console.error("Error fetching profile address:", error);
    return NextResponse.json({ address: null }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { address } = await request.json();

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ shipping_address: address })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile address:", error);
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 });
  }
}
