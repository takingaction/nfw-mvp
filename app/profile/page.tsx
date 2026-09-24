import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import { getImpersonationContext } from "@/lib/impersonation";

export const metadata = {
  title: "My Profile",
  description: "Manage your National Fund for Women member profile.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const viewAsCtx = await getImpersonationContext();
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const nextUrl = sp?.next || "/profile";
    redirect(`/auth/login?next=${encodeURIComponent(nextUrl)}`);
  }

  // View-as: cookie-based. Reads the target from the nfw_view_as cookie.
  const viewAsUserId = viewAsCtx?.targetUserId ?? null;
  const effectiveUserId = viewAsUserId ?? user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", effectiveUserId)
    .single();

  const membershipLevel = profile?.membership_level || "free";
  const subscriptionStatus = profile?.subscription_status || "active";
  const subscriptionEndsAt = profile?.subscription_ends_at
    ? new Date(profile.subscription_ends_at)
    : null;

  return (
    <>
      <ProfileClient
        profile={profile}
        user={user}
        membershipLevel={membershipLevel}
        subscriptionStatus={subscriptionStatus}
        subscriptionEndsAt={subscriptionEndsAt}
      />
    </>
  );
}
