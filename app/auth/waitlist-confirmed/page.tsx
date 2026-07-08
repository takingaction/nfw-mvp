import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function WaitlistConfirmedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no user, redirect to signup
  if (!user) {
    redirect("/auth/sign-up");
  }

  // Verify user is on waitlist
  const { data: profile } = await supabase
    .from("profiles")
    .select("membership_level, waitlist_position")
    .eq("id", user.id)
    .single();

  // If not on waitlist, redirect to signup
  if (profile?.membership_level !== "waitlist") {
    redirect("/auth/sign-up?step=3");
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
          <Check className="w-4 h-4 text-nfw-wisteria" />
          <span className="text-nfw-dove font-semibold font-ui">
            Waitlist Confirmation
          </span>
        </div>

        <h1 className="font-serif text-4xl lg:text-5xl text-white mb-6 leading-tight">
          Thanks for joining the waitlist!
        </h1>

        <p className="font-serif text-lg text-nfw-lilac mb-8 max-w-md mx-auto leading-relaxed">
          If you&apos;d like to join today as a Contributing Member for $1.25/month (billed annually at $15), click the button below and immediately get access to monthly microgrants, discounts you can use everyday, and the Zero Dollar Store.
        </p>

        <div className="flex flex-col gap-3 justify-center mb-8">
          <Link
            href="/auth/sign-up?step=3"
            className="inline-flex items-center justify-center px-6 py-3 bg-nfw-citrine text-nfw-blackberry font-bold font-ui text-sm hover:bg-nfw-citrine/90 transition-all"
          >
            BECOME A CONTRIBUTING MEMBER
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-white/10 text-nfw-dove border border-white/20 font-bold font-ui text-sm hover:bg-white/20 transition-all"
          >
            Go to Dashboard
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
