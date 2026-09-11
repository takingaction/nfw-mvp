import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export const metadata = {
  title: "My Profile",
  description: "Manage your National Fund for Women member profile.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const nextUrl = searchParams?.next || "/profile";
    redirect(`/auth/login?next=${encodeURIComponent(nextUrl)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const membershipLevel = profile?.membership_level || "free";
  const subscriptionStatus = profile?.subscription_status || "active";
  const subscriptionEndsAt = profile?.subscription_ends_at
    ? new Date(profile.subscription_ends_at)
    : null;

  return (
    <ProfileClient
      profile={profile}
      user={user}
      membershipLevel={membershipLevel}
      subscriptionStatus={subscriptionStatus}
      subscriptionEndsAt={subscriptionEndsAt}
    />
  );
}
