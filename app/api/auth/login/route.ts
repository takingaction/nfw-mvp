import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  recordSuccessfulLogin,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    // Check rate limit
    const rateLimit = await checkLoginRateLimit(email, ipAddress);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.error,
          lockoutExpiresAt: rateLimit.lockoutExpiresAt,
        },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const emailLower = email.toLowerCase().trim();

    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLower,
      password,
    });

    if (error || !data.user) {
      // Record failed attempt
      await recordFailedLoginAttempt(emailLower, ipAddress, userAgent);

      // Check if we just hit the rate limit with this attempt
      const newRateLimit = await checkLoginRateLimit(emailLower, ipAddress);
      if (!newRateLimit.allowed) {
        return NextResponse.json(
          {
            error: newRateLimit.error,
            lockoutExpiresAt: newRateLimit.lockoutExpiresAt,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: error?.message || "Invalid email or password",
          remainingAttempts: newRateLimit.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // Record successful login (clears failed attempts)
    await recordSuccessfulLogin(emailLower);

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error("[auth/login] Error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}