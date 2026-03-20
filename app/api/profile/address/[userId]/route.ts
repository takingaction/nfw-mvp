import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("shipping_address")
      .eq("id", userId)
      .single();

    return NextResponse.json({
      address: profile?.shipping_address || null,
    });
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
    const supabase = await createClient();

    const { error } = await supabase
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
