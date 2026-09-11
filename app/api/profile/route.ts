import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("zip")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ zip: null });
    }

    return NextResponse.json({ zip: profile?.zip || null });
  } catch {
    return NextResponse.json({ zip: null });
  }
}