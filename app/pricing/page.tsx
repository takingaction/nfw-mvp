import Link from "next/link";
import { Check } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free Member",
    price: "$0",
    period: "forever",
    description: "A warm welcome to the NFW community.",
    features: [
      "Access to NFW community",
      "Monthly newsletter",
      "Event notifications",
      "Read member articles and resources",
    ],
    highlighted: false,
    badge: null,
  },
  {
    id: "contributing",
    name: "Contributing Member",
    price: "$15",
    period: "/year",
    description:
      "The most popular way to support NFW and unlock real benefits.",
    features: [
      "Everything in Free",
      "Apply for microgrants up to $1,000",
      "Member perks and discounts platform",
      "Access to Zero Dollar Store",
      "Voting rights on NFW initiatives",
      "Member badge and recognition",
    ],
    highlighted: false,
    badge: "Most Popular",
  },
  {
    id: "founding",
    name: "Founding Member",
    price: "$100",
    period: "/year",
    description:
      "For women who want to make the biggest impact on the mission.",
    features: [
      "Everything in Contributing",
      "Founding member recognition",
      "Early access to events and programs",
      "Direct input on NFW initiatives",
      "Priority grant application review",
      "Exclusive founding member badge",
    ],
    highlighted: true,
    badge: "Most Impact",
  },
];

const allBenefits = [
  { label: "Community access", free: true, contributing: true, founding: true },
  {
    label: "Monthly newsletter",
    free: true,
    contributing: true,
    founding: true,
  },
  {
    label: "Event notifications",
    free: true,
    contributing: true,
    founding: true,
  },
  {
    label: "Articles and resources",
    free: true,
    contributing: true,
    founding: true,
  },
  {
    label: "Microgrant applications",
    free: false,
    contributing: true,
    founding: true,
  },
  {
    label: "Perks and discounts platform",
    free: false,
    contributing: true,
    founding: true,
  },
  {
    label: "Zero Dollar Store access",
    free: false,
    contributing: true,
    founding: true,
  },
  { label: "Voting rights", free: false, contributing: true, founding: true },
  { label: "Member badge", free: false, contributing: true, founding: true },
  {
    label: "Founding member recognition",
    free: false,
    contributing: false,
    founding: true,
  },
  {
    label: "Early access to events",
    free: false,
    contributing: false,
    founding: true,
  },
  {
    label: "Direct input on initiatives",
    free: false,
    contributing: false,
    founding: true,
  },
  {
    label: "Priority grant review",
    free: false,
    contributing: false,
    founding: true,
  },
];

export const metadata = {
  title: "Membership Plans",
  description:
    "Join the National Fund for Women for $15/year and unlock microgrants, 1,000+ perks, the Zero Dollar Store, and more.",
  openGraph: {
    title: "Membership Plans | National Fund for Women",
    description:
      "Join NFW for $15/year and unlock microgrants, perks, and more.",
    url: "https://nationalfundforwomen.org/pricing",
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630 }],
  },
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-nfw-dove">
      {/* HERO */}
      <div className="bg-nfw-aubergine">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-dove mb-6">
            Membership that gives back
          </p>
          <h1 className="font-serif text-4xl lg:text-6xl text-nfw-dove mb-6 leading-tight">
            Support that fits your life.
          </h1>
          <p className="font-serif text-xl text-nfw-dove max-w-2xl mx-auto mb-8">
            Every membership level helps fund the NFW mission. Choose the level
            that works for you — and unlock benefits that make a real difference
            in your everyday life.
          </p>
          <div className="flex flex-wrap justify-center gap-6 font-sans text-sm text-nfw-dove/70">
            <span>Cancel anytime</span>
            <span>Funds go directly to women in need</span>
            <span>Join in minutes</span>
          </div>
        </div>
      </div>

      {/* PRICING CARDS */}
      <div className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-3">
              Choose your membership
            </h2>
            <p className="font-sans text-nfw-blackberry/60 text-lg">
              Every tier supports the mission. Upgrade anytime as your needs
              grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`p-8 border ${
                  plan.highlighted
                    ? "border-nfw-aubergine bg-nfw-aubergine"
                    : "border-nfw-blackberry/10 bg-white"
                }`}
              >
                {plan.badge && (
                  <span
                    className={`inline-block font-ui text-xs font-black tracking-[0.06em] uppercase px-3 py-1 mb-4 ${
                      plan.highlighted
                        ? "bg-nfw-citrine text-nfw-blackberry"
                        : "bg-nfw-lilac/30 text-nfw-blackberry"
                    }`}
                  >
                    {plan.badge}
                  </span>
                )}

                <h3
                  className={`font-ui text-sm font-black tracking-[0.06em] uppercase mb-2 ${
                    plan.highlighted ? "text-nfw-dove" : "text-nfw-blackberry"
                  }`}
                >
                  {plan.name}
                </h3>

                <div className="mb-3">
                  <span
                    className={`text-4xl font-black ${
                      plan.highlighted ? "text-nfw-citrine" : "text-nfw-blackberry"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm ml-1 ${
                      plan.highlighted ? "text-nfw-lilac" : "text-nfw-blackberry/50"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>

                <p
                  className={`font-sans text-sm mb-6 ${
                    plan.highlighted ? "text-nfw-lilac" : "text-nfw-blackberry/60"
                  }`}
                >
                  {plan.description}
                </p>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-[#d4f1ad] flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-nfw-blackberry" />
                      </div>
                      <span
                        className={`font-sans text-sm ${
                          plan.highlighted ? "text-nfw-dove" : "text-nfw-blackberry/70"
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Single Join Now CTA */}
          <div className="text-center bg-white p-10 border border-nfw-blackberry/10">
            <h3 className="font-serif text-2xl text-nfw-aubergine mb-3">
              Ready to join?
            </h3>
            <p className="font-sans text-nfw-blackberry/60 mb-6 max-w-md mx-auto">
              Create your free account first, then choose your membership level.
              It only takes a few minutes.
            </p>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center justify-center px-10 py-4 bg-nfw-aubergine text-nfw-dove font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors"
            >
              Join Now
            </Link>
            <p className="font-sans text-sm text-nfw-blackberry/40 mt-4">
              Already a member?{" "}
              <Link
                href="/auth/login"
                className="underline hover:text-nfw-blackberry transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* FULL BENEFITS COMPARISON TABLE */}
      <div className="py-16 lg:py-24 bg-nfw-dove">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-3">
              Everything included
            </p>
            <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-3">
              Compare all benefits
            </h2>
            <p className="font-sans text-nfw-blackberry/60">
              See exactly what&apos;s included at every level.
            </p>
          </div>

          <div className="border border-nfw-blackberry/10 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-4 bg-nfw-aubergine px-6 py-4">
              <div className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-lilac">
                Benefit
              </div>
              <div className="text-center font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-lilac">
                Free
              </div>
              <div className="text-center font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-citrine">
                Contributing
              </div>
              <div className="text-center font-ui text-sm font-black tracking-[0.03em] uppercase text-[#d4f1ad]">
                Founding
              </div>
            </div>

            {/* Table Rows */}
            {allBenefits.map((benefit, i) => (
              <div
                key={benefit.label}
                className={`grid grid-cols-4 px-6 py-4 items-center ${
                  i % 2 === 0 ? "bg-nfw-dove" : "bg-white"
                }`}
              >
                <div className="font-sans text-sm text-nfw-blackberry">
                  {benefit.label}
                </div>
                <div className="flex justify-center">
                  {benefit.free ? (
                    <div className="w-5 h-5 bg-[#d4f1ad] flex items-center justify-center">
                      <Check className="w-3 h-3 text-nfw-blackberry" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-nfw-blackberry/10 flex items-center justify-center">
                      <span className="text-nfw-blackberry/30 text-xs">—</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-center">
                  {benefit.contributing ? (
                    <div className="w-5 h-5 bg-[#d4f1ad] flex items-center justify-center">
                      <Check className="w-3 h-3 text-nfw-blackberry" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-nfw-blackberry/10 flex items-center justify-center">
                      <span className="text-nfw-blackberry/30 text-xs">—</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-center">
                  {benefit.founding ? (
                    <div className="w-5 h-5 bg-[#d4f1ad] flex items-center justify-center">
                      <Check className="w-3 h-3 text-nfw-blackberry" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-nfw-blackberry/10 flex items-center justify-center">
                      <span className="text-nfw-blackberry/30 text-xs">—</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHY MEMBERSHIP MATTERS */}
      <div className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-3">
                Why it matters
              </p>
              <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-4 leading-tight">
                Your membership funds the mission
              </h2>
              <p className="font-sans text-lg text-nfw-blackberry/70 mb-6">
                Every dollar from membership goes directly toward funding
                microgrants, building the perks platform, and advocating for
                women across the country. When you join, you&apos;re not just getting
                benefits — you&apos;re helping another woman get the support she
                needs.
              </p>
              <p className="font-sans text-lg text-nfw-blackberry/70 mb-8">
                NFW is built on the belief that small, consistent support
                creates lasting change. Your membership is part of that.
              </p>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center justify-center px-8 py-4 bg-nfw-citrine text-nfw-blackberry font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
              >
                Join the Community
              </Link>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: "$2.5M+ in grants awarded",
                  description:
                    "Member dues directly fund microgrants that help women cover emergency bills, childcare, medical costs and more.",
                },
                {
                  title: "50,000+ women supported",
                  description:
                    "A growing community of women across all 50 states finding relief, connection and resources through NFW.",
                },
                {
                  title: "1,000+ perks and discounts",
                  description:
                    "Members save an average of $500+ per year on everyday essentials through the NFW perks platform.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 p-6 border border-nfw-blackberry/10 bg-nfw-lilac/20"
                >
                  <div className="flex-shrink-0 w-8 h-8 mt-0.5">
                    <Check className="w-5 h-5 text-nfw-blackberry" />
                  </div>
                  <div>
                    <p className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-1">
                      {item.title}
                    </p>
                    <p className="font-sans text-sm text-nfw-blackberry/60">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="bg-nfw-aubergine py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-4xl lg:text-6xl text-nfw-dove mb-6">
            Ready to feel supported?
          </h2>
          <p className="font-serif text-xl text-nfw-dove mb-8 max-w-2xl mx-auto">
            Join thousands of women who have already found relief, connection
            and real support through NFW. Your journey starts here.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
            {[
              {
                title: "Microgrants",
                sub: "Up to $1,000 in support",
              },
              {
                title: "Exclusive Perks",
                sub: "Save $500+ per year",
              },
              {
                title: "Community",
                sub: "50,000+ women strong",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 text-left"
              >
                <div className="flex-shrink-0 w-6 h-6 bg-nfw-lilac/40 flex items-center justify-center mt-1">
                </div>
                <div>
                  <div className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-dove mb-1">{item.title}</div>
                  <div className="font-sans text-sm text-nfw-dove">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center justify-center px-10 py-5 bg-nfw-citrine text-nfw-blackberry font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
          >
            Become a Member Today
          </Link>
          <p className="font-sans text-sm text-nfw-lilac mt-6">
            Join in minutes. No credit card required to browse.
          </p>
        </div>
      </div>
    </main>
  );
}
