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
              Share the power of community and empowerment with the women in your life.
              A National Fund for Women membership opens doors to financial grants,
              exclusive perks, and a network of support.
            </p>

            <div className="space-y-4 mb-8">
              {BENEFITS.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-nfw-wisteria/20 flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-nfw-wisteria" />
                  </div>
                  <span className="text-nfw-blackberry/80">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-6 text-sm text-nfw-blackberry/60">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>The perfect gift</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>Supports women</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 border border-nfw-blackberry/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-nfw-citrine/30 flex items-center justify-center">
                <Gift className="w-5 h-5 text-nfw-aubergine" />
              </div>
              <div>
                <h2 className="font-serif text-xl text-nfw-aubergine">
                  Gift a Membership
                </h2>
                <p className="text-sm text-nfw-blackberry/60">
                  $15 per membership · 1 year access
                </p>
              </div>
            </div>

            <form onSubmit={handlePurchase} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-nfw-blackberry mb-2">
                  Number of memberships
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg border border-nfw-blackberry/20 flex items-center justify-center text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold text-nfw-aubergine w-8 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="w-10 h-10 rounded-lg border border-nfw-blackberry/20 flex items-center justify-center text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-nfw-blackberry mb-2">
                  Your name
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-nfw-blackberry/20 focus:border-nfw-wisteria focus:ring-2 focus:ring-nfw-wisteria/20 outline-none transition-all"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-nfw-blackberry mb-2">
                  Your email
                </label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-nfw-blackberry/20 focus:border-nfw-wisteria focus:ring-2 focus:ring-nfw-wisteria/20 outline-none transition-all"
                  placeholder="jane@example.com"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="pt-4 border-t border-nfw-blackberry/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-nfw-blackberry/70">Total</span>
                  <span className="text-2xl font-bold text-nfw-aubergine">
                    ${15 * quantity}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 bg-nfw-citrine text-nfw-blackberry font-bold rounded-lg hover:bg-nfw-citrine/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5" />
                      Purchase Gift{quantity > 1 ? "s" : ""}
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="text-xs text-nfw-blackberry/50 text-center mt-4">
              Secure checkout powered by Stripe. Gift codes will be emailed immediately after purchase.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}