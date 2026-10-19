import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWaitlistApprovalEmail } from "@/lib/email";

export const WAITLIST_TOKEN_TTL_DAYS = 30;
const SITE_URL = "https://www.nationalfundforwomen.org";

export function waitlistTokenExpiry(): string {
  return new Date(
    Date.now() + WAITLIST_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

/**
 * Send the waitlist approval email for an acceptance token and link the
 * resulting email_sends row to the token, so /admin/waitlist can show
 * delivery status (delivered / bounced / failed) for that link.
 *
 * Never throws. Returns { success: false, error } if the email didn't go out.
 */
export async function sendApprovalEmailForToken(
  supabase: SupabaseClient,
  {
    tokenId,
    userId,
    email,
    name,
  }: { tokenId: string; userId: string; email: string; name: string | null },
): Promise<{ success: boolean; error?: string }> {
  const acceptUrl = `${SITE_URL}/auth/accept-waitlist?token=${tokenId}`;

  let result: Awaited<ReturnType<typeof sendWaitlistApprovalEmail>>;
  try {
    result = await sendWaitlistApprovalEmail({
      to: email,
      name: name || "Member",
      acceptUrl,
      userId,
    });
  } catch (err) {
    console.error("[waitlist-approval] Error sending approval email:", err);
    return { success: false, error: "EMAIL_SEND_FAILED" };
  }

  if (result.emailSendId) {
    const { error: linkError } = await supabase
      .from("waitlist_acceptance_tokens")
      .update({ email_send_id: result.emailSendId })
      .eq("id", tokenId);
    if (linkError) {
      console.error("[waitlist-approval] Failed to link email_send_id:", linkError);
    }
  }

  return result.success ? { success: true } : { success: false, error: result.error };
}
