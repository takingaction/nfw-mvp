import { blockIfViewingAs } from "@/lib/view-as";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  GIFT_CODE_ERROR_MESSAGES,
  describeGift,
  hashClientIp,
  type GiftTier,
} from "@/lib/gift-codes";
import {
  getGiftCodeStatus,
  isGiftLookupRateLimited,
  recordGiftLookupFailure,
  redeemGiftCode,
  runPostRedeemSideEffects,
} from "@/lib/gift-code-service";

function rateLimited() {
  return NextResponse.json(
    { valid: false, error: "Too many attempts. Please wait a few minutes and try again." },
    { status: 429 },
  );
}

/**
 * Redeem a gift code for the logged-in user.
 * Response contract is unchanged for web + mobile callers:
 *   200 { success, message, subscriptionEndsAt, membershipLevel }
 *   4xx { error, errorCode }
 */
export async function POST(request: Request) {
  const viewAsBlocked = blockIfViewingAs(request);
  if (viewAsBlocked) return viewAsBlocked;

  try {
    const { code } = await request.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Gift code is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to redeem a gift code" },
        { status: 401 },
      );
    }

    const ipHash = hashClientIp(request.headers);
    if (await isGiftLookupRateLimited(ipHash)) return rateLimited();

    const result = await redeemGiftCode(code, user.id, user.email ?? null);

    if (!result.ok) {
      if (result.error === "invalid") await recordGiftLookupFailure(ipHash);
      return NextResponse.json(
        { error: GIFT_CODE_ERROR_MESSAGES[result.error], errorCode: result.error },
        { status: result.error === "already_member" ? 409 : 400 },
      );
    }

    if (user.email) {
      await runPostRedeemSideEffects({
        userId: user.id,
        email: user.email,
        name: result.full_name,
        tier: result.membership_level,
        endsAt: result.subscription_ends_at,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Gift code redeemed! You now have ${describeGift(result.membership_level, result.membership_months)}.`,
      subscriptionEndsAt: result.subscription_ends_at,
      membershipLevel: result.membership_level,
    });
  } catch (error) {
    console.error("Gift code redemption error:", error);
    return NextResponse.json({ error: "Failed to redeem gift code" }, { status: 500 });
  }
}

/** Check a code without redeeming it. Rate-limited per IP on invalid lookups. */
export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "Gift code is required" }, { status: 400 });
    }

    const ipHash = hashClientIp(request.headers);
    if (await isGiftLookupRateLimited(ipHash)) return rateLimited();

    const status = await getGiftCodeStatus(code);

    if (status.status === "invalid") {
      await recordGiftLookupFailure(ipHash);
      return NextResponse.json({ valid: false, error: GIFT_CODE_ERROR_MESSAGES.invalid });
    }
    if (status.status !== "valid") {
      return NextResponse.json({
        valid: false,
        error: GIFT_CODE_ERROR_MESSAGES[status.status],
        redeemed: status.status === "redeemed",
        errorCode: status.status,
      });
    }

    const tier = (status.tier ?? "contributing") as GiftTier;
    return NextResponse.json({
      valid: true,
      message: "This gift code is valid!",
      tier,
      description: describeGift(tier, status.membership_months ?? 12),
      expiresAt: status.expires_at ?? null,
    });
  } catch (error) {
    console.error("Gift code validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate gift code" },
      { status: 500 },
    );
  }
}
