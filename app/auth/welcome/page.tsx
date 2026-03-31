import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function WelcomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_completed, membership_level")
      .eq("id", user.id)
      .single();

    if (!profile?.profile_completed) {
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
        description: membershipLevel === "founding"
          ? "Thank you for your Founding Membership. You now have access to everything NFW offers — with exclusive Founding Member benefits."
          : "Thank you for your Contributing Membership. You now have access to everything we offer — microgrants, perks, the Zero Dollar Store, and a community that has your back.",
      };
    }
    return {
      badge: "Welcome to the community",
      title: "You're officially a member!",
      description: "Welcome to NFW. You now have access to everything we offer — microgrants, perks, the Zero Dollar Store, and a community that has your back.",
    };
  };

  const content = getWelcomeContent();

  return (
    <main className="min-h-screen bg-nfw-blackberry flex items-center justify-center px-4 relative overflow-hidden">
      <div className="relative max-w-lg w-full text-center">
        <div className="w-20 h-20 bg-[#d4f1ad] flex items-center justify-center mx-auto mb-8">
          <Check className="w-10 h-10 text-nfw-blackberry" strokeWidth={3} />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-lilac/20 border border-nfw-lilac/30 text-sm mb-6">
          <span className="w-2 h-2 bg-[#d4f1ad]"></span>
          <span className="text-nfw-dove font-semibold">
            {content.badge}
          </span>
        </div>

        <h1 className="font-serif text-4xl lg:text-6xl text-white mb-4 leading-tight">
          {content.title}
        </h1>

        <p className="text-nfw-lilac text-lg mb-10 max-w-md mx-auto leading-relaxed">
          {content.description}
        </p>

        <div className="grid grid-cols-3 gap-4 mb-10 max-w-sm mx-auto">
          {[
            { color: "bg-[#d4f1ad]", label: "Microgrants", sub: "Apply today" },
            { color: "bg-nfw-citrine", label: "Perks", sub: "1,000+ deals" },
            { color: "bg-[#b2d1ee]", label: "Store", sub: "Free items" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white/5 border border-white/10 p-4 text-center"
            >
              <div
                className={`w-8 h-8 ${item.color} mx-auto mb-2 flex items-center justify-center`}
              >
                <Check className="w-4 h-4 text-nfw-blackberry" />
              </div>
              <p className="text-white font-bold text-sm">{item.label}</p>
              <p className="text-nfw-lilac text-xs">{item.sub}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-nfw-citrine text-nfw-blackberry font-bold text-lg hover:bg-nfw-citrine/90 transition-all"
          >
            Go to my dashboard
          </Link>
          <Link
            href="/grants"
            className="inline-flex items-center justify-center px-8 py-4 bg-white/10 text-white border border-white/20 font-bold text-lg hover:bg-white/20 transition-all"
          >
            Apply for a grant
          </Link>
        </div>

        <p className="text-nfw-lilac/50 text-xs mt-8">
          Questions?{" "}
          <a
            href="mailto:michelle@nationalfundforwomen.org"
            className="underline hover:text-nfw-lilac transition-colors"
          >
            Contact us
          </a>
        </p>
      </div>
    </main>
  );
}
