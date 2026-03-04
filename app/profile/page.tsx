import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ManageSubscription from "../../components/ManageSubscription";
import ProfileCompletionForm from "../../components/ProfileCompletionForm";

export const metadata = {
  title: "My Profile",
  description: "Manage your National Fund for Women member profile.",
};

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

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
    free: { label: "Free Member", color: "bg-[#2d1239]/10 text-[#2d1239]" },
    contributing: {
      label: "Contributing Member",
      color: "bg-[#b2d1ee]/30 text-[#2d1239]",
    },
    founding: {
      label: "Founding Member",
      color: "bg-[#BCAFCF]/30 text-[#2d1239]",
    },
  };

  const currentMembership =
    membershipDisplay[membershipLevel] || membershipDisplay.free;

  return (
    <main className="min-h-screen bg-white">
      {/* Lean Header */}
      <div className="bg-white pt-8 pb-6 border-b border-[#2d1239]/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-3xl sm:text-4xl font-bold text-[#2d1239] mb-2"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Your Profile
          </h2>
          <p className="text-[#2d1239]/60">
            Manage your NFW membership and profile information.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Membership Status Card */}
        <div className="bg-white rounded-xl border border-[#2d1239]/10 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#2d1239] mb-2">
                Membership Status
              </h3>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${currentMembership.color}`}
              >
                {currentMembership.label}
              </span>

              {subscriptionStatus === "canceling" && subscriptionEndsAt && (
                <p className="text-sm text-[#fdf493] mt-2 flex items-center gap-1">
                  <span>⚠️</span> Your membership will end on{" "}
                  {subscriptionEndsAt.toLocaleDateString()}
                </p>
              )}
            </div>
            <ManageSubscription membershipLevel={membershipLevel} />
          </div>

          {membershipLevel === "free" && (
            <p className="text-sm text-[#2d1239]/50 mt-4">
              Upgrade your membership to unlock exclusive perks and support
              NFW&apos;s mission.
            </p>
          )}
        </div>

        {/* Profile Information Card */}
        <div className="bg-white rounded-xl border border-[#2d1239]/10 p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#2d1239] mb-4">
            Profile Information
          </h3>

          {profile ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start py-2 border-b border-[#2d1239]/5">
                <span className="text-sm text-[#2d1239]/50">Full Name</span>
                <p className="font-medium text-[#2d1239]">
                  {profile.full_name || "Not set"}
                </p>
              </div>
              <div className="flex justify-between items-start py-2 border-b border-[#2d1239]/5">
                <span className="text-sm text-[#2d1239]/50">Email</span>
                <p className="font-medium text-[#2d1239]">{user.email}</p>
              </div>
              <div className="flex justify-between items-start py-2 border-b border-[#2d1239]/5">
                <span className="text-sm text-[#2d1239]/50">Location</span>
                <p className="font-medium text-[#2d1239]">
                  {profile.city && profile.state
                    ? `${profile.city}, ${profile.state} ${profile.zip || ""}`
                    : "Not set"}
                </p>
              </div>
              <div className="flex justify-between items-start py-2">
                <span className="text-sm text-[#2d1239]/50">Member Since</span>
                <p className="font-medium text-[#2d1239]">
                  {profile.joined_at
                    ? new Date(profile.joined_at).toLocaleDateString()
                    : new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[#2d1239]/50">Complete your profile below.</p>
          )}
        </div>

        {/* Update Profile Card */}
        <div className="bg-white rounded-xl border border-[#2d1239]/10 p-6">
          <h3 className="text-lg font-semibold text-[#2d1239] mb-4">
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
