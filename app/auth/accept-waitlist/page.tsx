import Link from "next/link";
import { Check, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { resyncProfileNow } from "@/lib/flodesk-sync";

const supabaseAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface PageProps {
  searchParams: Promise<{
    token?: string;
    error?: string;
  }>;
}

export default async function AcceptWaitlistPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token;
  const errorParam = params.error;

  // If someone navigates to /auth/accept-waitlist without a token, send
  // them to the welcome page (no useful state to show).
  if (!token && !errorParam) {
    redirect("/auth/welcome");
  }

  // If we got here via the error redirect path (no token but with error),
  // render the error state directly.
  if (!token) {
    return renderErrorPage(errorParam || "invalid");
  }

  // Require an authenticated session. The token is the credential, but
  // we need a logged-in user to apply the upgrade to.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Send the user through login and return them to this page (with
    // token preserved in the next URL). After login, the callback
    // redirects here and processing continues.
    const nextUrl = `/auth/accept-waitlist?token=${encodeURIComponent(token)}`;
    redirect(`/auth/login?next=${encodeURIComponent(nextUrl)}`);
  }

  // Look up the token via service-role to determine its status
  const { data: tokenRow } = await supabaseAdmin
    .from("waitlist_acceptance_tokens")
    .select("id, user_id, expires_at, used_at, expired_processed_at")
    .eq("id", token)
    .maybeSingle();

  if (!tokenRow) {
    return renderErrorPage("invalid");
  }

  // Distinguish the failure modes the user might see
  if (tokenRow.used_at) {
    return renderErrorPage("stale");
  }
  if (new Date(tokenRow.expires_at) < new Date()) {
    return renderErrorPage("expired");
  }
  if (tokenRow.expired_processed_at) {
    return renderErrorPage("expired");
  }
  if (tokenRow.user_id !== user.id) {
    // Token belongs to a different user — silently treat as invalid
    return renderErrorPage("invalid");
  }

  // Look up the profile to verify they're still on the waitlist.
  // If they upgraded to contributing/founding between approval and click,
  // refuse to downgrade them.
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("membership_level, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return renderErrorPage("invalid");
  }

  if (profile.membership_level !== "waitlist") {
    return renderErrorPage("already_upgraded");
  }

  // Atomic mark-token-used (race guard on used_at IS NULL).
  const { data: updatedToken } = await supabaseAdmin
    .from("waitlist_acceptance_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", token)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (!updatedToken) {
    // Lost the race to a parallel click. Show "already accepted" rather
    // than retrying — the other click's update will have succeeded.
    return renderErrorPage("stale");
  }

  // Upgrade profile to free membership
  const { error: upgradeError } = await supabaseAdmin
    .from("profiles")
    .update({
      membership_level: "free",
      is_approved_free_member: true,
      free_membership_contact_submitted: true,
      profile_completed: true,
      previous_membership_level: "waitlist",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (upgradeError) {
    // Compensating action: roll the token back to unused so the member
    // can retry (e.g. the email link still works for 30 days).
    await supabaseAdmin
      .from("waitlist_acceptance_tokens")
      .update({ used_at: null })
      .eq("id", token);
    console.error("[accept-waitlist] Profile upgrade failed:", upgradeError);
    return renderErrorPage("invalid");
  }

  // Fire-and-forget: exit the Waitlist Flodesk segment. The hourly
  // sweep is the backstop if this fails.
  void resyncProfileNow(user.id);

  // Success — redirect to the welcome page with the new "Free Member"
  // copy. The /auth/welcome page reads membership_level from the profile.
  redirect("/auth/welcome");
}

function renderErrorPage(errorType: string) {
  let title: string;
  let message: string;
  let badge: string;

  switch (errorType) {
    case "expired":
      title = "This invitation has expired";
      message =
        "You remain on our waitlist and we'll be in touch when a spot opens up. If you have questions, please contact us.";
      badge = "Invitation Expired";
      break;
    case "stale":
      title = "Already accepted";
      message =
        "This invitation has already been used. Your membership should be active — please log in to access your dashboard.";
      badge = "Invitation Used";
      break;
    case "already_upgraded":
      title = "Your membership is already active";
      message =
        "There's nothing more to do here. Please log in to access your dashboard.";
      badge = "Already a Member";
      break;
    case "invalid":
    default:
      title = "This invitation link is invalid";
      message =
        "Please contact support if you believe this is in error.";
      badge = "Invalid Link";
      break;
  }

  return (
    <main className="min-h-screen bg-nfw-aubergine flex items-center justify-center px-4 relative overflow-hidden">
      <div className="relative max-w-lg w-full text-center">
        <img
          src="/images/nfw-symbol-brandmark-wisteria.png"
          alt="NFW"
          className="w-40 object-contain mx-auto mb-8"
        />

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-lilac/20 border border-nfw-lilac/30 text-sm mb-6">
          <XCircle className="w-4 h-4 text-nfw-citrine" />
          <span className="text-nfw-dove font-semibold font-ui">
            {badge}
          </span>
        </div>

        <h1 className="font-serif text-4xl lg:text-5xl text-white mb-6 leading-tight">
          {title}
        </h1>

        <p className="font-serif text-lg text-nfw-lilac mb-8 max-w-md mx-auto leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col gap-3 justify-center mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-nfw-citrine text-nfw-blackberry font-bold font-ui text-sm hover:bg-nfw-citrine/90 transition-all"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-white/10 text-nfw-dove border border-white/20 font-bold font-ui text-sm hover:bg-white/20 transition-all"
          >
            Back to Homepage
          </Link>
        </div>

        <p className="font-ui text-xs text-nfw-lilac/50 mt-8">
          Questions?{" "}
          <Link
            href="/contact"
            className="underline hover:text-nfw-lilac transition-colors"
          >
            Contact us
          </Link>
        </p>
      </div>
    </main>
  );
}
