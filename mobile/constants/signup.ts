/**
 * Sign-up / profile constants — copied verbatim from components/SignUpFlow.tsx and
 * components/ProfileCompletionForm.tsx so option values stay byte-identical with the web.
 */

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export const INCOME_RANGES = [
  "Less than $25k",
  "$25k-50k",
  "$50-75k",
  "$75-$100k",
  "$100-150k",
  "$150-200k",
  "$200-250k",
  "More than $250k",
] as const;

export const IDENTITY_OPTIONS = [
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
] as const;

export const PASSWORD_REQUIREMENTS: { id: string; label: string; test: (p: string) => boolean }[] = [
  { id: "length", label: "8+ characters", test: (p) => p.length >= 8 },
  { id: "uppercase", label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "Number", test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "Special character (!@#$%^&*)", test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

export function isPasswordValid(p: string): boolean {
  return PASSWORD_REQUIREMENTS.every((r) => r.test(p));
}

export interface Plan {
  id: "free" | "contributing" | "founding";
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
  badge: string | null;
}

/** PLANS from SignUpFlow.tsx. Web renders only contributing + founding (free is a waitlist link). */
export const PLANS: Plan[] = [
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
    highlighted: false,
    badge: null,
  },
  {
    id: "contributing",
    name: "Contributing Member",
    price: "$15",
    period: "/year",
    description: "The most popular way to support NFW and build power for women across the country.",
    features: [
      "Unlimited applications to monthly microgrants",
      "Access to hundreds of perks & discounts saving you thousands annually",
      "Shop surprise & delight giveaways via the Zero Dollar Store",
      "Access to NFW community supporting women across the country",
    ],
    highlighted: true,
    badge: "Most Popular",
  },
  {
    id: "founding",
    name: "Founding Member",
    price: "$100",
    period: "/year",
    description: "For women who want to make the biggest impact on the mission — and help cover membership costs for other women.",
    features: [
      "Cover membership for five other women",
      "Exclusive founding member profile badge and recognition",
      "Unlimited access to all NFW Programs",
      "Access to NFW community supporting women across the country",
    ],
    highlighted: false,
    badge: "Most Impact",
  },
];

/** Progress chips shown on steps 1–3 (web: STEPS.slice(1)). */
export const SIGNUP_STEPS = ["Personal Info", "Identity", "Membership"] as const;

export const WAITLIST_MODAL_COPY =
  "If contributing financially isn't possible, this tier is for you. A simple gut check: if you have stable housing, regular income, and financial breathing room, a higher tier is probably a better fit for you. The National Fund for Women doesn't exist without membership dues. To continue to the free member waitlist, please click the button below.";

/** Today − 18 years as YYYY-MM-DD (UTC). Web: max attribute on the DOB input. */
export function maxDobIso(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - 18);
  return d.toISOString().split("T")[0];
}

export const MIN_DOB_ISO = "1900-01-01";
