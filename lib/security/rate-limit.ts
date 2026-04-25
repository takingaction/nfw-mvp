import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockoutExpiresAt?: string;
  error?: string;
}

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function checkLoginRateLimit(email: string, ipAddress?: string): Promise<RateLimitResult> {
  const adminClient = getAdminClient();
  const emailLower = email.toLowerCase().trim();
  const cutoffTime = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();

  // Count failed attempts in the lockout window
  const { count, error } = await adminClient
    .from("login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("email", emailLower)
    .eq("success", false)
    .gte("attempted_at", cutoffTime);

  if (error) {
    console.error("Rate limit check error:", error);
    // On error, allow the attempt (fail open)
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const attemptCount = count || 0;

  if (attemptCount >= MAX_ATTEMPTS) {
    // Get the earliest attempt to calculate lockout expiry
    const { data: earliestAttempt } = await adminClient
      .from("login_attempts")
      .select("attempted_at")
      .eq("email", emailLower)
      .eq("success", false)
      .gte("attempted_at", cutoffTime)
      .order("attempted_at", { ascending: true })
      .limit(1)
      .single();

    let lockoutExpiresAt: string | undefined;
    if (earliestAttempt) {
      lockoutExpiresAt = new Date(
        new Date(earliestAttempt.attempted_at).getTime() + LOCKOUT_MINUTES * 60 * 1000
      ).toISOString();
    }

    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutExpiresAt,
      error: `Too many failed login attempts. Please try again in ${LOCKOUT_MINUTES} minutes.`,
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - attemptCount,
  };
}

export async function recordFailedLoginAttempt(email: string, ipAddress?: string, userAgent?: string): Promise<void> {
  const adminClient = getAdminClient();
  const emailLower = email.toLowerCase().trim();

  await adminClient.from("login_attempts").insert({
    email: emailLower,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    success: false,
  });
}

export async function recordSuccessfulLogin(email: string): Promise<void> {
  const adminClient = getAdminClient();
  const emailLower = email.toLowerCase().trim();

  // Clear all failed attempts for this email on successful login
  await adminClient
    .from("login_attempts")
    .delete()
    .eq("email", emailLower)
    .eq("success", false);
}

export async function cleanupOldLoginAttempts(): Promise<number> {
  const adminClient = getAdminClient();
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const { count, error } = await adminClient
    .from("login_attempts")
    .delete()
    .lt("attempted_at", cutoffDate);

  if (error) {
    console.error("Cleanup error:", error);
    return 0;
  }

  return count || 0;
}