import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import GrantsStatusWidget from "@/components/GrantsStatusWidget";
import RecentRedemptions from "@/components/dashboard/RecentRedemptions";
import RecentClaims from "@/components/dashboard/RecentClaims";
import Link from "next/link";
import AccessPerksSync from "@/components/AccessPerksSync";
import {
  FileText,
  Gift,
  ShoppingBag,
  User,
  Crown,
  TrendingUp,
} from "lucide-react";

export const metadata = {
  title: "Dashboard",
  description: "Your National Fund for Women member dashboard.",
};

export default async function DashboardPage() {
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

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Redirect if profile is not completed or membership not selected
  if (!profile?.profile_completed) {
    redirect("/auth/sign-up?step=1");
  } else if (!profile?.membership_level) {
    redirect("/auth/sign-up?step=3");
  }

  // Fetch grant applications for status widget
  const { data: grants } = await supabase
    .from("grants")
    .select("status")
    .eq("user_id", user.id);

  const grantStatusCounts = {
    total: grants?.length || 0,
    in_process:
      grants?.filter(
        (g) => g.status === "submitted" || g.status === "under_review",
      ).length || 0,
    approved: grants?.filter((g) => g.status === "approved").length || 0,
    funded: grants?.filter((g) => g.status === "funded").length || 0,
  };

  const membershipDisplay: Record<
    string,
    {
      label: string;
      bgColor: string;
      textColor: string;
      borderColor: string;
    }
  > = {
    free: {
      label: "Free Member",
      bgColor: "bg-nfw-dove",
      textColor: "text-nfw-blackberry",
      borderColor: "border-nfw-blackberry/20",
    },
    contributing: {
      label: "Contributing Member",
      bgColor: "bg-nfw-lilac/20",
      textColor: "text-nfw-blackberry",
      borderColor: "border-nfw-lilac",
    },
    founding: {
      label: "Founding Member",
      bgColor: "bg-[#d4f1ad]/30",
      textColor: "text-nfw-blackberry",
      borderColor: "border-[#d4f1ad]",
    },
  };

  const currentMembership =
    membershipDisplay[profile?.membership_level || "free"];

  return (
    <main className="min-h-screen bg-nfw-dove">
      <AccessPerksSync userId={user.id} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-nfw-aubergine mb-2 font-serif">
            Welcome back, {profile?.full_name || "Member"}
          </h1>
          <p className="text-nfw-blackberry/60">
            Here&apos;s what&apos;s happening with your NFW membership
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-nfw-lilac/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-nfw-blackberry" />
                </div>
                <h3 className="text-lg font-semibold text-nfw-aubergine">
                  Membership Status
                </h3>
              </div>

              <div
                className={`inline-flex items-center gap-2 px-4 py-2 border-2 text-sm font-semibold mb-4 ${currentMembership.bgColor} ${currentMembership.textColor} ${currentMembership.borderColor}`}
              >
                {currentMembership.label}
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm">
                  <span className="text-nfw-blackberry/60">Member Since: </span>
                  <span className="font-medium text-nfw-blackberry">
                    {profile?.joined_at
                      ? new Date(profile.joined_at).toLocaleDateString(
                          "en-US",
                          { month: "short", year: "numeric" },
                        )
                      : "Recently"}
                  </span>
                </div>
                {profile?.subscription_ends_at && (
                  <div className="text-sm">
                    <span className="text-nfw-blackberry/60">Renews: </span>
                    <span className="font-medium text-nfw-blackberry">
                      {new Date(
                        profile.subscription_ends_at,
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>

              <Link
                href="/profile"
                className="inline-flex items-center gap-2 text-nfw-blackberry hover:text-nfw-blackberry/80 text-sm font-medium transition-colors"
              >
                Manage Membership
                <TrendingUp className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <GrantsStatusWidget statusCounts={grantStatusCounts} />
        </div>

        <div className="mb-6">
          <RecentRedemptions />
        </div>

        <div className="mb-6">
          <RecentClaims />
        </div>

        <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
          <div className="p-6 border-b border-nfw-blackberry/10">
            <h3 className="text-lg font-semibold text-nfw-aubergine">
              Quick Actions
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-nfw-blackberry/10">
            <Link
              href="/grants/apply"
              className="p-6 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-nfw-lilac flex items-center justify-center group-hover:bg-nfw-lilac/80 transition-colors">
                  <FileText className="w-5 h-5 text-nfw-blackberry" />
                </div>
                <div>
                  <h4 className="font-semibold text-nfw-blackberry mb-1">
                    Apply for Microgrant
                  </h4>
                  <p className="text-xs text-nfw-blackberry/60">
                    Submit your application
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/perks"
              className="p-6 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-nfw-lilac flex items-center justify-center group-hover:bg-nfw-lilac/80 transition-colors">
                  <Gift className="w-5 h-5 text-nfw-blackberry" />
                </div>
                <div>
                  <h4 className="font-semibold text-nfw-blackberry mb-1">
                    Browse Member Perks
                  </h4>
                  <p className="text-xs text-nfw-blackberry/60">
                    Exclusive discounts & offers
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/store"
              className="p-6 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-nfw-lilac flex items-center justify-center group-hover:bg-nfw-lilac/80 transition-colors">
                  <ShoppingBag className="w-5 h-5 text-nfw-blackberry" />
                </div>
                <div>
                  <h4 className="font-semibold text-nfw-blackberry mb-1">
                    Zero Dollar Store
                  </h4>
                  <p className="text-xs text-nfw-blackberry/60">
                    Shop free essentials
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/profile"
              className="p-6 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-nfw-lilac flex items-center justify-center group-hover:bg-nfw-lilac/80 transition-colors">
                  <User className="w-5 h-5 text-nfw-blackberry" />
                </div>
                <div>
                  <h4 className="font-semibold text-nfw-blackberry mb-1">
                    Update Profile
                  </h4>
                  <p className="text-xs text-nfw-blackberry/60">
                    Manage your information
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
