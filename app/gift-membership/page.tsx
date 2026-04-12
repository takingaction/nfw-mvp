"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check, Gift, Users, Heart } from "lucide-react";
import Link from "next/link";

const BENEFITS = [
  "Unlimited applications to monthly microgrants",
  "Access to hundreds of perks & discounts saving you thousands annually",
  "Shop surprise & delight giveaways via the Zero Dollar Store",
  "Access to NFW community supporting women across the country",
];

export default function GiftMembershipPage() {
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    const prefetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setBuyerEmail(user.email);
        setPrefilled(true);
      }
    };
    prefetchUser();
  }, []);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gift-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          buyerName,
          buyerEmail,
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err: any) {
      setError(err.message || "Failed to start checkout");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-nfw-dove">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-nfw-wisteria/20 text-nfw-wisteria text-xs font-semibold rounded-full mb-6">
              <Gift className="w-3.5 h-3.5" />
              GIFT MEMBERSHIP
            </div>

            <h1 className="text-4xl lg:text-5xl font-black text-nfw-aubergine mb-6 font-serif leading-tight">
              Give the gift of membership
            </h1>

            <p className="text-lg text-nfw-blackberry/70 mb-8 leading-relaxed">
              Share the power of connection and support with the women in your life. 
              Your gift provides one full year of Contributing Membership — giving them 
              access to microgrants, hundreds of perks, and a community of women nationwide.
            </p>

            <div className="space-y-4 mb-8">
              {BENEFITS.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-nfw-wisteria flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-nfw-blackberry/80 text-sm">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="bg-nfw-lilac/20 border border-nfw-lilac/30 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-nfw-lilac flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-nfw-blackberry text-sm font-medium mb-1">
                    The perfect gift for:
                  </p>
                  <p className="text-nfw-blackberry/60 text-sm">
                    Sisters, mothers, daughters, friends, colleagues, mentors — any woman 
                    who deserves access to community, resources, and support.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white border border-nfw-blackberry/10 rounded-2xl p-8 shadow-lg">
              <div className="text-center mb-8">
                <p className="text-sm font-semibold text-nfw-blackberry/50 uppercase tracking-wide mb-2">
                  Gift Membership
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-black text-nfw-aubergine font-serif">$15</span>
                  <span className="text-nfw-blackberry/50 text-sm">/year each</span>
                </div>
              </div>

              <form onSubmit={handlePurchase} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-nfw-blackberry mb-2">
                    Number of Gift Codes
                  </label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-nfw-blackberry/20 text-nfw-blackberry bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent text-sm"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "code" : "codes"} — ${15 * n}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-nfw-blackberry mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-4 py-3 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/30 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-nfw-blackberry mb-2">
                    Your Email
                  </label>
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="jane@email.com"
                    className="w-full px-4 py-3 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/30 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent text-sm"
                  />
                  {prefilled && (
                    <p className="text-xs text-nfw-blackberry/40 mt-1">
                      Pre-filled from your account
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-nfw-aubergine text-white font-bold text-base hover:bg-nfw-aubergine/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 rounded-lg"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Redirecting to checkout..." : `Purchase ${quantity} ${quantity === 1 ? "Code" : "Codes"} — $${15 * quantity}`}
                </button>

                <p className="text-xs text-nfw-blackberry/40 text-center">
                  Secure payment via Stripe. Codes will be emailed to you.
                </p>
              </form>
            </div>

            <div className="mt-6 flex items-center justify-center gap-8 text-sm text-nfw-blackberry/50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Share with friends</span>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                <span>1 year each</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-nfw-blackberry/50 text-sm">
            Want to redeem a gift code?{" "}
            <Link href="/auth/sign-up" className="text-nfw-wisteria font-semibold hover:underline">
              Create an account
            </Link>{" "}
            or{" "}
            <Link href="/auth/login" className="text-nfw-wisteria font-semibold hover:underline">
              sign in
            </Link>{" "}
            and enter it during signup.
          </p>
        </div>
      </div>
    </main>
  );
}