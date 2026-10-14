import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  GIFT_CODE_ERROR_MESSAGES,
  describeGift,
  formatGiftCodeForPrint,
  normalizeGiftCode,
  hashClientIp,
  type GiftTier,
} from "@/lib/gift-codes";
import {
  getGiftCodeStatus,
  isGiftLookupRateLimited,
  recordGiftLookupFailure,
} from "@/lib/gift-code-service";
import RedeemClient, { type RedeemView } from "./RedeemClient";

export const metadata = {
  title: "Redeem Your Gift Membership | National Fund for Women",
  description: "Someone gave you a National Fund for Women membership. Redeem your gift code here.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Landing page for printed QR codes: /redeem?code=K7MPQ2XR
 * Without a code it shows an entry form.
 */
export default async function RedeemPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code: rawCode } = await searchParams;
  const code = rawCode ? normalizeGiftCode(rawCode) : "";

  if (!code) {
    return <RedeemClient view={{ kind: "enter" }} />;
  }

  const ipHash = hashClientIp(await headers());
  if (await isGiftLookupRateLimited(ipHash)) {
    return <RedeemClient view={{ kind: "error", code, message: "Too many attempts. Please wait a few minutes and try again." }} />;
  }

  const status = await getGiftCodeStatus(code);
  const display = formatGiftCodeForPrint(code);

  if (status.status !== "valid") {
    if (status.status === "invalid") await recordGiftLookupFailure(ipHash);
    return (
      <RedeemClient
        view={{ kind: "error", code: display, message: GIFT_CODE_ERROR_MESSAGES[status.status] }}
      />
    );
  }

  const gift = describeGift((status.tier ?? "contributing") as GiftTier, status.membership_months ?? 12);
  const expiresAt = status.expires_at ?? null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let view: RedeemView;
  if (!user) {
    const next = `/redeem?code=${code}`;
    view = {
      kind: "logged_out",
      code: display,
      gift,
      expiresAt,
      signUpHref: `/auth/sign-up?gift=${code}`,
      loginHref: `/auth/login?next=${encodeURIComponent(next)}`,
    };
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_completed, membership_level, subscription_status, subscription_ends_at")
      .eq("id", user.id)
      .single();

    // Unfinished sign-up: finish the profile first; step 3 applies the code.
    if (!profile?.profile_completed) {
      redirect(`/auth/sign-up?step=1&gift=${code}`);
    }

    const activePaid =
      profile.membership_level !== "free" &&
      ["active", "trialing", "past_due", "canceling"].includes(profile.subscription_status ?? "") &&
      (!profile.subscription_ends_at || new Date(profile.subscription_ends_at) > new Date());

    view = activePaid
      ? { kind: "already_member", code: display, gift }
      : { kind: "ready", code, displayCode: display, gift, expiresAt, email: user.email ?? "" };
  }

  return <RedeemClient view={view} />;
}
