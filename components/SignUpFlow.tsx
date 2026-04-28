"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check, ChevronRight, ArrowLeft, Gift, ChevronDown } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const INCOME_RANGES = [
  "Less than $25k",
  "$25k-50k",
  "$50-75k",
  "$75-$100k",
  "$100-150k",
  "$150-200k",
  "$200-250k",
  "More than $250k",
];

// Password validation requirements
const PASSWORD_REQUIREMENTS = [
  { id: "length", label: "8+ characters", test: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "Special character (!@#$%^&*)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

const IDENTITY_OPTIONS = [
  "I'm raising kids",
  "I help take care of a family member",
  "Others rely on me financially",
  "I'm working full-time",
  "I'm working part-time or gig work",
  "I'm juggling multiple jobs or income sources",
  "I'm in school or training",
  "I'm dealing with a health issue or disability",
  "I'm new to the U.S. or first-generation",
  "I'm part of the LGBTQ+ community",
  "I'm a woman",
  "I've faced barriers because of my identity or background",
  "None of these",
  "Prefer not to say",
];

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DC",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const PLANS = [
  {
    id: "free",
    name: "Free member",
    price: "$0",
    period: "forever",
    description: "A warm welcome to the NFW community.",
    features: [
      "Access to monthly microgrants",
      "Access to hundreds of perks & discounts saving you thousands annually",
      "Shop surprise & delight giveaways via the Zero Dollar Store",
      "Access to NFW community supporting women across the country",
    ],
    priceId: null,
    highlighted: false,
    badge: null,
  },
  {
    id: "contributing",
    name: "Contributing Member",
    price: "$15",
    period: "/year",
    description:
      "The most popular way to support NFW and build power for women across the country.",
    features: [
      "Unlimited applications to monthly microgrants",
      "Access to hundreds of perks & discounts saving you thousands annually",
      "Shop surprise & delight giveaways via the Zero Dollar Store",
      "Access to NFW community supporting women across the country",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CONTRIBUTING,
    highlighted: true,
    badge: "Most Popular",
  },
  {
    id: "founding",
    name: "Founding Member",
    price: "$100",
    period: "/year",
    description:
      "For women who want to make the biggest impact on the mission — and help cover membership costs for other women.",
    features: [
      "Cover membership for five other women",
      "Exclusive founding member profile badge and recognition",
      "Unlimited access to all NFW Programs",
      "Access to NFW community supporting women across the country",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FOUNDING,
    highlighted: false,
    badge: "Most Impact",
  },
];

interface GiftCodeState {
  code: string;
  applied: boolean;
  validating: boolean;
  error: string | null;
  success: boolean;
}

const BENEFITS = [
  "Microgrants from $100-$5,000",
  "Thousands of perks & discounts",
  "Zero Dollar Store giveaways",
  "Feel-good support that is simple, fast and low stress",
  "A community that gets it",
  "Part of something bigger — helping shape the future for women",
];

const STEPS = ["Account", "Personal Info", "Identity", "Membership"];

export default function SignUpFlow() {
  const searchParams = useSearchParams();
  const initialStep = parseInt(searchParams.get("step") || "0");
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [giftCode, setGiftCode] = useState<GiftCodeState>({
    code: "",
    applied: false,
    validating: false,
    error: null,
    success: false,
  });
  const [showGiftCodeInput, setShowGiftCodeInput] = useState(false);

  // Step 0
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Password validation
  const passwordChecks = useMemo(() =>
    PASSWORD_REQUIREMENTS.map(req => ({
      ...req,
      passed: req.test(password),
    })),
    [password]
  );
  const isPasswordValid = passwordChecks.every(c => c.passed);

  // Steps 1-2
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [income, setIncome] = useState("");
  const [identities, setIdentities] = useState<string[]>([]);
  const [socialHandles, setSocialHandles] = useState({
    instagram: "",
    tiktok: "",
    facebook: "",
    linkedin: "",
  });

  const toggleIdentity = (id: string) => {
    setIdentities((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // Check if user has confirmed email when on steps 1-3
  useEffect(() => {
    if (step === 0) return;
    
    const checkConfirmation = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email_confirmed_at) {
        // User hasn't confirmed email, redirect to success page
        window.location.href = "/auth/sign-up-success";
      }
    };
    
    checkConfirmation();
  }, [step]);

  const inputClass =
    "w-full px-4 py-3 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/30 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent transition-all text-sm";
  const labelClass = "block text-sm font-semibold text-nfw-blackberry mb-1.5";

  const saveProfile = async (data: Record<string, any>) => {
    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to save");
  };

  // Step 0 — Create account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== repeatPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!isPasswordValid) {
      setError("Password must meet all requirements below");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/sign-up?step=1`,
        },
      });
      if (error) throw error;
      // Redirect to success page to check email
      window.location.href = "/auth/sign-up-success?email=" + encodeURIComponent(email);
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    const supabase = createClient();
    setIsGoogleLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setIsGoogleLoading(false);
    }
  };

  // Step 1 — Save personal info
  const handlePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await saveProfile({
        full_name: fullName,
        phone_number: phone,
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        state,
        zip,
      });
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — Save identity/income (full profile save)
  const handleIdentity = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: at least one identity must be selected
    if (identities.length === 0) {
      setError("Please select at least one option");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await saveProfile({
        full_name: fullName,
        date_of_birth: dateOfBirth,
        phone_number: phone,
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        state,
        zip,
        household_income: income,
        identities,
        social_handles: socialHandles,
        profile_completed: true,
      });
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — Select membership
  const handleSelectPlan = async (plan: (typeof PLANS)[0]) => {
    if (!plan.priceId) {
      // Free plan - mark profile as completed, set membership_level, and redirect to welcome
      setLoading(true);
      setError(null);
      try {
        // Get current user ID for Access Perks sync
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        await saveProfile({ profile_completed: true, membership_level: "free" });
        // Send welcome email
        try {
          await fetch("/api/welcome-email", { method: "POST" });
        } catch (err) {
          console.error("Failed to send welcome email:", err);
        }
        // Sync to Access Perks
        try {
          await fetch("/api/access-perks/sync-member", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user?.id }),
          });
        } catch (err) {
          console.error("Failed to sync to Access Perks:", err);
        }
        window.location.assign("/auth/welcome");
      } catch (err: any) {
        setError(err.message || "Failed to complete signup. Please try again.");
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: plan.priceId,
          membershipLevel: plan.id,
          cancelUrl: `${window.location.origin}/auth/sign-up?step=3`,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  const validateGiftCode = async () => {
    if (!giftCode.code.trim()) {
      setGiftCode((prev) => ({ ...prev, error: "Please enter a gift code" }));
      return;
    }

    setGiftCode((prev) => ({ ...prev, validating: true, error: null }));

    try {
      const res = await fetch(`/api/gift-codes/redeem?code=${encodeURIComponent(giftCode.code)}`);
      const data = await res.json();

      if (!data.valid) {
        setGiftCode((prev) => ({
          ...prev,
          validating: false,
          error: data.error || "Invalid gift code",
        }));
        return;
      }

      setGiftCode((prev) => ({
        ...prev,
        validating: false,
        success: true,
        applied: true,
      }));
    } catch (err: any) {
      setGiftCode((prev) => ({
        ...prev,
        validating: false,
        error: "Failed to validate code. Please try again.",
      }));
    }
  };

  const applyGiftCode = async () => {
    if (!giftCode.code.trim()) {
      setGiftCode((prev) => ({ ...prev, error: "Please enter a gift code" }));
      return;
    }

    setGiftCode((prev) => ({ ...prev, validating: true, error: null }));

    try {
      const res = await fetch("/api/gift-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: giftCode.code }),
      });
      const data = await res.json();

      if (data.error) {
        setGiftCode((prev) => ({
          ...prev,
          validating: false,
          error: data.error,
        }));
        return;
      }

      setGiftCode((prev) => ({
        ...prev,
        validating: false,
        success: true,
        applied: true,
      }));

      // Save profile as completed with contributing membership
      await saveProfile({
        profile_completed: true,
        membership_level: "contributing",
        subscription_status: "active",
        subscription_ends_at: data.subscriptionEndsAt,
      });

      window.location.href = "/auth/welcome";
    } catch (err: any) {
      setGiftCode((prev) => ({
        ...prev,
        validating: false,
        error: "Failed to apply code. Please try again.",
      }));
    }
  };

  // Safety timeout to reset loading state if checkout hangs
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 30000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const BackButton = ({ toStep }: { toStep: number }) => (
    <button
      type="button"
      onClick={() => {
        setError(null);
        setStep(toStep);
      }}
      className="flex items-center gap-1.5 text-sm text-nfw-blackberry/50 hover:text-nfw-blackberry transition-colors mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </button>
  );

  return (
    <div className="min-h-screen bg-nfw-dove flex">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 xl:px-16">
        <div className="max-w-md w-full mx-auto">
          <Link href="/" className="inline-block mb-8">
            <img
              src="/images/nfw-symbol-brandmark-aubergine.png"
              alt="NFW"
              className="h-12 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </Link>

          {step > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                {STEPS.slice(1).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 flex items-center justify-center text-xs font-black transition-all ${
                        step > i + 1
                          ? "bg-nfw-wisteria text-white"
                          : step === i + 1
                            ? "bg-nfw-blackberry text-white"
                            : "bg-nfw-blackberry/10 text-nfw-blackberry/40"
                      }`}
                    >
                      {step > i + 1 ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span
                      className={`text-xs font-semibold hidden sm:block ${step === i + 1 ? "text-nfw-blackberry" : "text-nfw-blackberry/40"}`}
                    >
                      {s}
                    </span>
                    {i < STEPS.length - 2 && (
                      <ChevronRight className="w-3 h-3 text-nfw-blackberry/20 ml-1" />
                    )}
                  </div>
                ))}
              </div>
              <div className="h-1.5 bg-nfw-blackberry/10 overflow-hidden">
                <div
                  className="h-full bg-nfw-blackberry transition-all duration-500"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-nfw-citrine/20 border border-nfw-blackberry/20">
              <p className="text-nfw-blackberry text-sm">{error}</p>
            </div>
          )}

          {step === 0 && (
            <form onSubmit={handleCreateAccount} className="space-y-5">
              <div>
                <h1 className="text-3xl font-black text-nfw-blackberry mb-1 font-serif">
                  Create your account
                </h1>
                <p className="text-nfw-blackberry/60 text-sm">
                  Already a member?{" "}
                  <Link
                    href="/auth/login"
                    className="text-nfw-blackberry font-semibold underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isGoogleLoading}
                className="w-full py-3 border border-nfw-blackberry/20 text-nfw-blackberry font-bold text-sm hover:bg-nfw-blackberry/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {isGoogleLoading ? "Redirecting..." : "Sign up with Google"}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-nfw-blackberry/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-nfw-dove px-2 text-nfw-blackberry/40">Or</span>
                </div>
              </div>

              <div>
                <label className={labelClass}>Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className={inputClass}
                />
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {passwordChecks.map((check) => (
                      <div key={check.id} className="flex items-center gap-2 text-xs">
                        {check.passed ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-nfw-blackberry/20" />
                        )}
                        <span className={check.passed ? "text-green-600" : "text-nfw-blackberry/40"}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Confirm password</label>
                <input
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className={inputClass}
                />
                {repeatPassword.length > 0 && password !== repeatPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !isPasswordValid || password !== repeatPassword}
                className="w-full py-3.5 bg-nfw-blackberry text-white font-bold text-base hover:bg-nfw-blackberry/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Creating account..." : "Continue"}
              </button>
              <p className="text-xs text-nfw-blackberry/40 text-center">
                By signing up you agree to our{" "}
                <Link href="/terms" className="underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline">
                  Privacy Policy
                </Link>
              </p>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handlePersonalInfo} className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-nfw-blackberry mb-1 font-serif">
                  Personal information
                </h2>
                <p className="text-nfw-blackberry/60 text-sm">
                  Help us get to know you a little better.
                </p>
              </div>
              <div>
                <label className={labelClass}>
                  Full name <span className="text-nfw-lilac">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Phone number <span className="text-nfw-lilac">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Address line 1 <span className="text-nfw-lilac">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street address"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Address line 2{" "}
                  <span className="text-nfw-blackberry/40 font-normal">
                    (Optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apt, suite, unit, etc."
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    City <span className="text-nfw-lilac">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    State <span className="text-nfw-lilac">*</span>
                  </label>
                  <select
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  ZIP code <span className="text-nfw-lilac">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  maxLength={5}
                  pattern="[0-9]{5}"
                  placeholder="12345"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-nfw-blackberry text-white font-bold text-base hover:bg-nfw-blackberry/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Saving..." : "Continue"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleIdentity} className="space-y-6">
              <BackButton toStep={1} />
              <div>
                <h2 className="text-2xl font-black text-nfw-blackberry mb-1 font-serif">
                  Context & identity
                </h2>
                <p className="text-nfw-blackberry/60 text-sm">
                  This helps us serve you better. All information is private.
                </p>
              </div>

              {/* Date of Birth */}
              <div>
                <label className={labelClass}>
                  Date of birth <span className="text-nfw-lilac">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={(() => {
                    const today = new Date();
                    const eighteenYearsAgo = new Date(today.setFullYear(today.getFullYear() - 18));
                    return eighteenYearsAgo.toISOString().split('T')[0];
                  })()}
                  min="1900-01-01"
                  className={inputClass}
                />
                <p className="text-xs text-nfw-blackberry/40 mt-1">You must be 18 or older to join</p>
              </div>

              {/* Household Income */}
              <div>
                <label className={labelClass}>
                  Which best describes your current annual income?{" "}
<span className="text-nfw-lilac">* </span>
                </label>
                <div className="space-y-2 mt-2">
                  {INCOME_RANGES.map((range) => (
                    <label
                      key={range}
                      className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${income === range ? "border-nfw-blackberry bg-nfw-blackberry/5" : "border-nfw-blackberry/10 hover:border-nfw-blackberry/30"}`}
                    >
                      <input
                        type="radio"
                        name="income"
                        value={range}
                        checked={income === range}
                        onChange={() => setIncome(range)}
                        className="accent-nfw-blackberry"
                        required
                      />
                      <span className="text-sm text-nfw-blackberry font-medium">
                        {range}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Identities */}
              <div>
                <label className={labelClass}>
                  Tell us a little about your life <span className="text-nfw-lilac">* </span>
                  <span className="text-nfw-blackberry/40 font-normal">
                    (Select all that apply)
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {IDENTITY_OPTIONS.map((id) => (
                    <label
                      key={id}
                      className={`flex items-center gap-2 p-2.5 border cursor-pointer transition-all text-sm ${identities.includes(id) ? "border-nfw-lilac bg-nfw-lilac/10" : "border-nfw-blackberry/10 hover:border-nfw-blackberry/20"}`}
                    >
                      <input
                        type="checkbox"
                        checked={identities.includes(id)}
                        onChange={() => toggleIdentity(id)}
                        className="accent-nfw-blackberry w-3.5 h-3.5"
                      />
                      <span className="text-nfw-blackberry">{id}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Social Handles - optional */}
              <div>
                <label className={labelClass}>
                  Social media handles{" "}
                  <span className="text-nfw-blackberry/40 font-normal">
                    (Optional)
                  </span>
                </label>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Instagram (@username)"
                    value={socialHandles.instagram}
                    onChange={(e) =>
                      setSocialHandles((prev) => ({ ...prev, instagram: e.target.value }))
                    }
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="TikTok (@username)"
                    value={socialHandles.tiktok}
                    onChange={(e) =>
                      setSocialHandles((prev) => ({ ...prev, tiktok: e.target.value }))
                    }
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Facebook (profile URL)"
                    value={socialHandles.facebook}
                    onChange={(e) =>
                      setSocialHandles((prev) => ({ ...prev, facebook: e.target.value }))
                    }
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="LinkedIn (profile URL)"
                    value={socialHandles.linkedin}
                    onChange={(e) =>
                      setSocialHandles((prev) => ({ ...prev, linkedin: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !income || !dateOfBirth}
                className="w-full py-3.5 bg-nfw-blackberry text-white font-bold text-base hover:bg-nfw-blackberry/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Saving..." : "Continue"}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <BackButton toStep={2} />
              <div>
                <h2 className="text-2xl font-black text-nfw-blackberry mb-1 font-serif">
                  Choose your membership
                </h2>
                <p className="text-nfw-blackberry/60 text-sm">
                  Every tier supports the mission. Upgrade anytime.
                </p>
              </div>

              {!giftCode.applied && (
                <div className="border border-nfw-lilac/30 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowGiftCodeInput(!showGiftCodeInput)}
                    className="w-full flex items-center justify-between p-4 bg-nfw-lilac/10 hover:bg-nfw-lilac/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Gift className="w-5 h-5 text-nfw-wisteria" />
                      <span className="font-semibold text-nfw-blackberry text-sm">
                        I have a gift code
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-nfw-blackberry/40 transition-transform ${showGiftCodeInput ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showGiftCodeInput && (
                    <div className="p-4 border-t border-nfw-lilac/20">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={giftCode.code}
                          onChange={(e) =>
                            setGiftCode((prev) => ({
                              ...prev,
                              code: e.target.value.toUpperCase(),
                              error: null,
                            }))
                          }
                          placeholder="Enter your gift code"
                          className="flex-1 px-4 py-2.5 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/30 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent text-sm font-mono uppercase"
                        />
                        <button
                          type="button"
                          onClick={applyGiftCode}
                          disabled={giftCode.validating || !giftCode.code.trim()}
                          className="px-5 py-2.5 bg-nfw-wisteria text-white font-semibold text-sm hover:bg-nfw-wisteria/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {giftCode.validating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Apply"
                          )}
                        </button>
                      </div>
                      {giftCode.error && (
                        <p className="text-red-600 text-sm mt-2">{giftCode.error}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {giftCode.applied && (
                <div className="p-4 bg-[#d4f1ad]/20 border border-[#d4f1ad]/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#d4f1ad] rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-nfw-blackberry" />
                    </div>
                    <div>
                      <p className="font-semibold text-nfw-blackberry text-sm">
                        Gift code applied!
                      </p>
                      <p className="text-nfw-blackberry/60 text-xs">
                        You now have 1 year of Contributing membership.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`border-2 p-5 transition-all ${plan.highlighted ? "border-nfw-blackberry bg-nfw-blackberry" : "border-nfw-blackberry/10 bg-white hover:border-nfw-blackberry/30"}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        {plan.badge && (
                          <span
                            className={`inline-block text-xs px-2.5 py-1 mb-2 font-semibold ${plan.highlighted ? "bg-nfw-citrine text-nfw-blackberry" : "bg-nfw-lilac/30 text-nfw-blackberry"}`}
                          >
                            {plan.badge}
                          </span>
                        )}
                        <h3
                          className={`font-black text-base font-serif ${plan.highlighted ? "text-white" : "text-nfw-blackberry"}`}
                        >
                          {plan.name}
                        </h3>
                        <p
                          className={`text-xs mt-0.5 ${plan.highlighted ? "text-nfw-lilac" : "text-nfw-blackberry/50"}`}
                        >
                          {plan.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-2xl font-black font-serif ${plan.highlighted ? "text-nfw-citrine" : "text-nfw-blackberry"}`}
                        >
                          {plan.price}
                        </span>
                        <span
                          className={`text-xs ml-1 ${plan.highlighted ? "text-nfw-lilac" : "text-nfw-blackberry/40"}`}
                        >
                          {plan.period}
                        </span>
                      </div>
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-nfw-wisteria flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                          <span
                            className={`text-xs ${plan.highlighted ? "text-nfw-dove" : "text-nfw-blackberry/70"}`}
                          >
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={loading}
                      className={`w-full py-2.5 font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                        plan.highlighted
                          ? "bg-nfw-citrine text-nfw-blackberry hover:bg-nfw-citrine/90"
                          : plan.id === "free"
                            ? "bg-nfw-blackberry/5 text-nfw-blackberry hover:bg-nfw-blackberry/10 border border-nfw-blackberry/10"
                            : "bg-nfw-blackberry text-white hover:bg-nfw-blackberry/90"
                      }`}
                    >
                      {loading && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      {plan.id === "free"
                        ? "Continue for free"
                        : `Join as ${plan.name}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:flex w-[420px] xl:w-[480px] bg-nfw-aubergine flex-col justify-center px-12 py-16 relative overflow-hidden flex-shrink-0">
        <div className="relative">
          <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-dove mb-6">
            JOIN WOMEN NATIONWIDE
          </p>
          <h2 className="font-serif text-4xl lg:text-6xl text-white mb-4 leading-tight">
            Become a Member
          </h2>
          <p className="text-white text-sm mb-10 leading-relaxed">
            NFW membership helps you get relief for yourself while helping other women at the same time. Membership includes:
          </p>
          <div className="space-y-4 mb-10">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-nfw-wisteria/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-nfw-dove text-sm font-medium">{b}</span>
              </div>
            ))}
          </div>
          <div className="bg-white/5 border border-white/10 p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-nfw-lilac/30 flex items-center justify-center text-lg flex-shrink-0">
                T
              </div>
              <div>
                <p className="text-nfw-dove text-sm leading-relaxed italic">
                  &ldquo;The perks alone saved me more than my membership cost
                  in the first month. I wish I had found NFW sooner.&rdquo;
                </p>
                <p className="text-nfw-lilac text-xs mt-2 font-semibold">
                  Tiana, 29 — Retail Manager
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
