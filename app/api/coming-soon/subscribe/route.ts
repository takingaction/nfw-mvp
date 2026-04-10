import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, website } = body;

    if (website) {
      return NextResponse.json({ success: true });
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let ipAddress = request.headers.get("x-forwarded-for") || "unknown";
    if (ipAddress === "unknown") {
      ipAddress = request.headers.get("x-real-ip") || "unknown";
    }
    const userAgent = request.headers.get("user-agent") || "unknown";

    const { error } = await supabase.from("coming_soon_emails").insert({
      email: email.toLowerCase().trim(),
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({
          success: true,
          message: "You're already on our list!",
        });
      }
      console.error("Email signup error:", error);
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Thanks for subscribing!",
    });
  } catch (err) {
    console.error("Subscribe route error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
