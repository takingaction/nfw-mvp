import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function WelcomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[Welcome] User:", user?.id, "email:", user?.email);
  console.log("[Welcome] email_confirmed_at:", user?.email_confirmed_at);

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_completed, membership_level")
      .eq("id", user.id)
      .single();

    console.log("[Welcome] Profile:", profile);

    if (!profile?.profile_completed) {
      console.log("[Welcome] profile_completed is false, redirecting to step 1");
      redirect("/auth/sign-up?step=1");
    }
  }

  const membershipLevel = user ? (await supabase
    .from("profiles")
    .select("membership_level")
    .eq("id", user!.id)
    .single()).data?.membership_level : null;

  const isPaidMember = membershipLevel === "contributing" || membershipLevel === "founding";

  const getWelcomeContent = () => {
    if (isPaidMember) {
      return {
        badge: "Membership Activated",
        title: membershipLevel === "founding" 
          ? "You're a Founding Member!" 
          : "You're a Contributing Member!",
      };
    }
    return {
      badge: "Welcome to the community",
      title: "You're officially a member!",
    };
  };

  const content = getWelcomeContent();

  return (
    <main className="min-h-screen bg-nfw-blackberry flex items-center justify-center px-4 relative overflow-hidden">
      <div className="relative max-w-lg w-full text-center">
        <img
            src="/images/nfw-symbol-brandmark-wisteria.png"
            alt="NFW"
            className="w-40 object-contain mx-auto mb-8"
          />

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-lilac/20 border border-nfw-lilac/30 text-sm mb-6">
          <span className="w-2 h-2 bg-[#d4f1ad]"></span>
          <span className="text-nfw-dove font-semibold font-ui">
            {content.badge}
          </span>
        </div>

        <h1 className="font-serif text-4xl lg:text-6xl text-white mb-2 leading-tight">
          {content.title}
        </h1>

        <p className="font-serif text-lg text-nfw-lilac mb-6 max-w-md mx-auto leading-relaxed">
          Welcome to NFW—and thank you for showing up for women. Your membership helps make this work possible, and gives you access to microgrants, perks, the Zero Dollar Store, a community that has your back, and more.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-nfw-citrine text-nfw-blackberry font-bold font-ui text-sm hover:bg-nfw-citrine/90 transition-all"
          >
            Go to my NFW member dashboard
          </Link>
          <Link
            href="/grants/apply"
            className="inline-flex items-center justify-center px-6 py-3 bg-nfw-lilac/20 text-nfw-dove border border-nfw-lilac/30 font-bold font-ui text-sm hover:bg-nfw-lilac/30 transition-all"
          >
            Apply for a grant
          </Link>
          <Link
            href="/perks"
            className="inline-flex items-center justify-center px-6 py-3 bg-nfw-lilac/20 text-nfw-dove border border-nfw-lilac/30 font-bold font-ui text-sm hover:bg-nfw-lilac/30 transition-all"
          >
            Explore Perks
          </Link>
          <Link
            href="/store"
            className="inline-flex items-center justify-center px-6 py-3 bg-nfw-lilac/20 text-nfw-dove border border-nfw-lilac/30 font-bold font-ui text-sm hover:bg-nfw-lilac/30 transition-all"
          >
            Browse the Zero Dollar Store
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