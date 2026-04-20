import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ManageSubscription from "../../components/ManageSubscription";
import ProfileCompletionForm from "../../components/ProfileCompletionForm";
import AvatarUpload from "../../components/profile/AvatarUpload";

export const metadata = {
  title: "My Profile",
  description: "Manage your National Fund for Women member profile.",
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
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

  const membershipDisplay: Record<string, { label: string; color: string }> = {
    free: { label: "Free Member", color: "bg-nfw-blackberry/10 text-nfw-blackberry" },
    contributing: {
      label: "Contributing Member",
      color: "bg-[#b2d1ee]/30 text-nfw-blackberry",
    },
    founding: {
      label: "Founding Member",
      color: "bg-nfw-lilac/30 text-nfw-blackberry",
    },
  };

  const currentMembership =
    membershipDisplay[membershipLevel] || membershipDisplay.free;

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-white pt-8 pb-6 border-b border-nfw-blackberry/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl lg:text-6xl leading-[1.1] text-nfw-blackberry mb-2">
            Your Profile
          </h2>
          <p className="text-nfw-blackberry/60">
            Manage your NFW membership and profile information.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AvatarUpload currentAvatarUrl={profile?.avatar_url} />

        <div className="bg-white border border-nfw-blackberry/10 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-nfw-blackberry mb-2">
                Membership Status
              </h3>
              <span
                className={`inline-block px-3 py-1 text-sm font-medium ${currentMembership.color}`}
              >
                {currentMembership.label}
              </span>

              {subscriptionStatus === "canceling" && subscriptionEndsAt && (
                <p className="text-sm text-nfw-citrine mt-2 flex items-center gap-1">
                  Your membership will end on{" "}
                  {subscriptionEndsAt.toLocaleDateString()}
                </p>
              )}
            </div>
            <ManageSubscription membershipLevel={membershipLevel} />
          </div>

          {membershipLevel === "free" && (
            <p className="text-sm text-nfw-blackberry/50 mt-4">
              Upgrade your membership to unlock exclusive perks and support
              NFW&apos;s mission.
            </p>
          )}
        </div>

        <div className="bg-white border border-nfw-blackberry/10 p-6 mb-6">
          <h3 className="text-lg font-semibold text-nfw-blackberry mb-4">
            Profile Information
          </h3>

          {profile ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start py-2 border-b border-nfw-blackberry/5">
                <span className="text-sm text-nfw-blackberry/50">Full Name</span>
                <p className="font-medium text-nfw-blackberry">
                  {profile.full_name || "Not set"}
                </p>
              </div>
              <div className="flex justify-between items-start py-2 border-b border-nfw-blackberry/5">
                <span className="text-sm text-nfw-blackberry/50">Email</span>
                <p className="font-medium text-nfw-blackberry">{user.email}</p>
              </div>
              <div className="flex justify-between items-start py-2 border-b border-nfw-blackberry/5">
                <span className="text-sm text-nfw-blackberry/50">Location</span>
                <p className="font-medium text-nfw-blackberry">
                  {profile.city && profile.state
                    ? `${profile.city}, ${profile.state} ${profile.zip || ""}`
                    : "Not set"}
                </p>
              </div>
              <div className="flex justify-between items-start py-2 border-b border-nfw-blackberry/5">
                <span className="text-sm text-nfw-blackberry/50">Member Since</span>
                <p className="font-medium text-nfw-blackberry">
                  {profile.joined_at
                    ? new Date(profile.joined_at).toLocaleDateString()
                    : new Date().toLocaleDateString()}
                </p>
              </div>
              {profile.household_income && (
                <div className="flex justify-between items-start py-2 border-b border-nfw-blackberry/5">
                  <span className="text-sm text-nfw-blackberry/50">Household Income</span>
                  <p className="font-medium text-nfw-blackberry">{profile.household_income}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-nfw-blackberry/50">Complete your profile below.</p>
          )}
        </div>

        <div className="bg-white border border-nfw-blackberry/10 p-6">
          <h3 className="text-lg font-semibold text-nfw-blackberry mb-4">
            {profile?.full_name
              ? "Update Your Profile"
              : "Complete Your Profile"}
          </h3>
          <ProfileCompletionForm userId={user.id} existingProfile={profile} />
        </div>
      </div>
    </main>
  );
}
