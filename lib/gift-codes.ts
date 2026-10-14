import { randomInt, createHash } from "crypto";

/**
 * Gift code helpers shared by the Stripe webhook, admin batch tools, and /redeem.
 * Server-only (uses node:crypto).
 *
 * Alphabet omits look-alikes 0, O, 1, I so printed codes are unambiguous.
 * Matches public.gift_code_random() in migration 202.
 */
export const GIFT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const GIFT_CODE_LENGTH = 8;

export type GiftTier = "contributing" | "founding";

export function generateGiftCode(): string {
  let code = "";
  for (let i = 0; i < GIFT_CODE_LENGTH; i++) {
    code += GIFT_CODE_ALPHABET[randomInt(GIFT_CODE_ALPHABET.length)];
  }
  return code;
}

/** "k7mp-q2xr " -> "K7MPQ2XR" */
export function normalizeGiftCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** "K7MPQ2XR" -> "K7MP-Q2XR" (print display only; redemption accepts either). */
export function formatGiftCodeForPrint(code: string): string {
  const clean = normalizeGiftCode(code);
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.nationalfundforwomen.org").replace(/\/$/, "");
}

export function buildRedeemUrl(code: string, siteUrl = getSiteUrl()): string {
  return `${siteUrl}/redeem?code=${normalizeGiftCode(code)}`;
}

export const TIER_LABEL: Record<GiftTier, string> = {
  contributing: "Contributing",
  founding: "Founding",
};

export function describeGift(tier: GiftTier, months: number): string {
  const duration = months === 12 ? "1 year" : months % 12 === 0 ? `${months / 12} years` : `${months} months`;
  return `${duration} of ${TIER_LABEL[tier]} membership`;
}

/** Error codes returned by redeem_gift_code() / gift_code_status(). */
export type GiftCodeError =
  | "invalid"
  | "redeemed"
  | "voided"
  | "expired"
  | "already_member"
  | "profile_not_found";

export const GIFT_CODE_ERROR_MESSAGES: Record<GiftCodeError, string> = {
  invalid: "Invalid gift code",
  redeemed: "This gift code has already been used",
  voided: "This gift code is no longer active",
  expired: "This gift code has expired",
  already_member:
    "You already have an active paid membership, so this code wasn't used. You can pass it on to someone else.",
  profile_not_found: "We couldn't find your member profile. Please finish signing up and try again.",
};

/** Hashed client IP for rate limiting (we don't store raw IPs). */
export function hashClientIp(headers: { get(name: string): string | null }): string {
  const ip =
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return createHash("sha256").update(`gift-code:${ip}`).digest("hex").slice(0, 32);
}

/** RFC 4180 CSV cell; also neutralizes spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
