import type { SupabaseClient } from "@supabase/supabase-js";
import getAdminClient from "@/lib/supabase/admin";
import type { GiftCodeError, GiftTier } from "@/lib/gift-codes";

/** Failed lookups allowed per hashed IP inside the window before we return 429. */
const MAX_FAILURES = 20;
const WINDOW_MINUTES = 15;

export type GiftCodeStatus = {
  status: "valid" | "invalid" | "redeemed" | "voided" | "expired";
  tier?: GiftTier;
  membership_months?: number;
  expires_at?: string | null;
};

export type RedeemResult =
  | {
      ok: true;
      membership_level: GiftTier;
      membership_months: number;
      subscription_ends_at: string;
      full_name: string | null;
      batch_name: string | null;
    }
  | { ok: false; error: GiftCodeError; membership_level?: string };

export async function isGiftLookupRateLimited(ipHash: string, admin: SupabaseClient = getAdminClient()) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await admin
    .from("gift_code_lookup_failures")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (error) {
    console.error("[gift-codes] rate limit check failed:", error);
    return false; // fail open, matching lib/security/rate-limit.ts
  }
  return (count ?? 0) >= MAX_FAILURES;
}

export async function recordGiftLookupFailure(ipHash: string, admin: SupabaseClient = getAdminClient()) {
  const { error } = await admin.from("gift_code_lookup_failures").insert({ ip_hash: ipHash });
  if (error) console.error("[gift-codes] failed to record lookup failure:", error);
}

export async function getGiftCodeStatus(code: string, admin: SupabaseClient = getAdminClient()): Promise<GiftCodeStatus> {
  const { data, error } = await admin.rpc("gift_code_status", { p_code: code });
  if (error) throw error;
  return data as GiftCodeStatus;
}

export async function redeemGiftCode(
  code: string,
  userId: string,
  email: string | null,
  admin: SupabaseClient = getAdminClient(),
): Promise<RedeemResult> {
  const { data, error } = await admin.rpc("redeem_gift_code", {
    p_code: code,
    p_user_id: userId,
    p_email: email,
  });
  if (error) throw error;
  return data as RedeemResult;
}

/** Welcome email + Access Perks sync. Failures are logged, never thrown. */
export async function runPostRedeemSideEffects(params: {
  userId: string;
  email: string;
  name: string | null;
  tier: GiftTier;
  endsAt: string;
  admin?: SupabaseClient;
}) {
  const admin = params.admin ?? getAdminClient();
  try {
    const { sendWelcomeEmail } = await import("@/lib/email");
    await sendWelcomeEmail({
      to: params.email,
      name: params.name || "there",
      membershipType: params.tier,
      memberId: params.userId,
      renewalDate: params.endsAt,
    });
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }
  try {
    const { checkAndSyncAccessMember } = await import("@/lib/access-perks/member-sync");
    await checkAndSyncAccessMember(admin, params.userId, params.email);
  } catch (err) {
    console.error("Failed to sync to Access Perks:", err);
  }
}
