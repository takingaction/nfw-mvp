import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get optional user data from request body
    const body = await request.json().catch(() => ({}));
    const { first_name, last_name, email } = body;

    // Use member_key - prefer access_perks_member_id if available, otherwise nfW user id
    let memberKey = user.id;
    
    // Try to get access_perks_member_id from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("access_perks_member_id")
      .eq("id", user.id)
      .single();

    if (profile?.access_perks_member_id) {
      memberKey = profile.access_perks_member_id;
    }

    // Sanitize member_key per Access requirements: alphanumeric, dash, underscore only
    const sanitizedMemberKey = memberKey
      .replace(/[^a-zA-Z0-9\-_]/g, "")
      .toUpperCase()
      .trim();

    // Fetch session token from Access Travel Auth API
    // Use the shared ACCESS_OFFERS_TOKEN (same token for both Travel SDK and main Perks API per Access)
    const authUrl = process.env.ACCESS_TRAVEL_AUTH_URL;
    const apiKey = process.env.ACCESS_OFFERS_TOKEN;

    if (!authUrl) {
      console.error("[travel/token] Missing ACCESS_TRAVEL_AUTH_URL");
      return NextResponse.json(
        { error: "Travel API not configured" },
        { status: 500 }
      );
    }

    if (!apiKey) {
      console.error("[travel/token] Missing ACCESS_OFFERS_TOKEN");
      return NextResponse.json(
        { error: "Travel API not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        member_key: sanitizedMemberKey,
        scope: "travel",
        ...(first_name && { first_name }),
        ...(last_name && { last_name }),
        ...(email && { email }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[travel/token] Access API error:", response.status, errorText);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key" },
          { status: 502 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to obtain session token" },
        { status: 502 }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      session_token: data.session_token,
    });
  } catch (error) {
    console.error("[travel/token] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}