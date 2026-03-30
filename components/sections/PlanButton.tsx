"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { PricingPlan } from "@/lib/sections/types";

interface PlanButtonProps {
  plan: PricingPlan;
}

const CITRINE_BUTTON_CLASS = "inline-flex items-center justify-center px-8 py-4 bg-nfw-citrine text-nfw-blackberry font-ui font-black text-sm tracking-[0.06em] uppercase transition-colors hover:bg-[#d4c490]";

export default function PlanButton({ plan }: PlanButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userMembership, setUserMembership] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setIsLoggedIn(true);
          const { data: profile } = await supabase
            .from("profiles")
            .select("membership_level")
            .eq("id", user.id)
            .single();
          
          setUserMembership(profile?.membership_level || null);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (!isLoggedIn) {
        router.push("/auth/sign-up");
        return;
      }

      const isPaidPlan = Boolean(plan.stripe_price_id);
      const isCurrentPlan = userMembership === plan.id;

      if (isPaidPlan) {
        if (isCurrentPlan) {
          const res = await fetch("/api/portal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          
          if (res.ok) {
            const data = await res.json();
            window.location.href = data.url;
          } else {
            console.error("Portal error");
          }
        } else {
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              priceId: plan.stripe_price_id,
              membershipLevel: plan.id,
              cancelUrl: window.location.href,
            }),
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              window.location.href = data.url;
            }
          }
        }
      }
    } catch (err) {
      console.error("Button click error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getButtonConfig = () => {
    if (checkingAuth) {
      return null;
    }

    const isPaidPlan = Boolean(plan.stripe_price_id);
    const isCurrentPlan = userMembership === plan.id;
    const isPaidMember = userMembership === "contributing" || userMembership === "founding";

    if (!isLoggedIn) {
      return {
        text: isPaidPlan ? "Upgrade" : "Join Free",
        disabled: false,
        className: CITRINE_BUTTON_CLASS,
      };
    }

    if (isPaidPlan) {
      if (isCurrentPlan) {
        return {
          text: "Manage Subscription",
          disabled: false,
          className: CITRINE_BUTTON_CLASS,
        };
      }
      return {
        text: "Upgrade",
        disabled: false,
        className: CITRINE_BUTTON_CLASS,
      };
    }

    // Free plan - if user is already a paid member, don't show button
    if (!isPaidPlan && isPaidMember) {
      return null;
    }

    // Free plan - user is on free tier - show disabled but styled button
    return {
      text: "Current Plan",
      disabled: true,
      className: CITRINE_BUTTON_CLASS + " opacity-50 cursor-not-allowed",
    };
  };

  const config = getButtonConfig();

  if (checkingAuth || !config) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      disabled={config.disabled || loading}
      className={`w-full py-3 px-6 ${config.className} font-ui font-black text-sm tracking-[0.06em] uppercase flex items-center justify-center gap-2 transition-opacity disabled:cursor-not-allowed hover:opacity-90`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {loading ? "Loading..." : config.text}
    </button>
  );
}
