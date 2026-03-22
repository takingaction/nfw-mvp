"use client";

import Link from "next/link";
import { Check } from "lucide-react";

const perks = [
  {
    category: "Insurance",
    name: "Fetch Pet Insurance",
    value: "5% off monthly premiums",
    color: "#F8F19A",
  },
  {
    category: "Travel",
    name: "Zipcar Car Sharing",
    value: "25% off annual membership",
    color: "#9CA6D2",
  },
  {
    category: "Health & Wellness",
    name: "Calm & Co.",
    value: "20% off mindfulness membership",
    color: "#d4f1ad",
  },
  {
    category: "Health & Wellness",
    name: "CVS Pharmacy",
    value: "Savings & Discounts by Optum Rx",
    color: "#d4f1ad",
  },
  {
    category: "Entertainment",
    name: "Ancestry",
    value: "50% off 1 year subscription",
    color: "#B693C0",
  },
  {
    category: "Shopping & Groceries",
    name: "bistroMD",
    value: "25% off plus Free Shipping on your first order",
    color: "#F8F19A",
  },
  {
    category: "Health & Wellness",
    name: "ClassPass",
    value: "Discounted credits so you can go to the gym",
    color: "#d4f1ad",
  },
  {
    category: "Shopping & Groceries",
    name: "HelloFresh",
    value: "60% off your first box plus free shipping",
    color: "#F8F19A",
  },
  {
    category: "Technology & Learning",
    name: "Skillshare",
    value: "30% off an annual membership",
    color: "#9CA6D2",
  },
  {
    category: "Travel",
    name: "Lyft Pass",
    value: "Special member-only discounts",
    color: "#9CA6D2",
  },
  {
    category: "Childcare & Family",
    name: "Care.com",
    value: "50% off your first month",
    color: "#B693C0",
  },
  {
    category: "Shopping & Groceries",
    name: "SUPERmarket",
    value: "25% off with free online shipping",
    color: "#F8F19A",
  },
];

const categories = [
  "All",
  "Childcare & Family",
  "Entertainment",
  "Insurance",
  "Health & Wellness",
  "Shopping & Groceries",
  "Technology & Learning",
  "Travel",
];

const testimonials = [
  {
    quote:
      "Using the perks has taken so much pressure off my weekly budget. I didn't realize how much I could save.",
    name: "Marion, 34",
    role: "Elementary School Teacher",
  },
  {
    quote:
      "The discounts on groceries & wellness things really add up. It feels like someone finally gets what moms need.",
    name: "Danielle, 39",
    role: "Medical Assistant",
  },
  {
    quote:
      "I claimed a few deals I already needed and saved more in a month than my membership cost. It was such a relief.",
    name: "Tiana, 29",
    role: "Retail Manager",
  },
  {
    quote:
      "I claimed a few deals I already needed and saved more in a month than my membership cost. It was such a relief.",
    name: "Evelyn, 82",
    role: "Retired Social Worker",
  },
  {
    quote:
      "I love checking for new perks. There's always something that makes the week easier or a little brighter.",
    name: "Lani, 21",
    role: "Nursing Student",
  },
  {
    quote:
      "As a student, every bit of savings helps. The travel and grocery perks have been game-changing for me.",
    name: "Priya, 47",
    role: "Administrative Coordinator",
  },
];

export default function PerksInfoPage() {
  return (
    <main className="min-h-screen bg-nfw-dove">
      <div className="relative bg-nfw-dove overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-aubergine mb-6">
                1,000+ member-only deals available now
              </p>
              <h1 className="font-serif text-5xl lg:text-6xl xl:text-[63px] text-nfw-aubergine leading-[1.05]">
                Save more on everyday essentials
              </h1>
              <p className="text-xl text-nfw-blackberry/70 max-w-lg leading-relaxed">
                Explore member-only perks that make everyday essentials,
                wellness and travel more affordable. New deals are added often
                so you always find something helpful.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href="/perks"
                  className="inline-flex items-center justify-center px-8 py-4 bg-nfw-blackberry text-nfw-dove font-bold text-lg transition-all hover:bg-nfw-blackberry/90"
                >
                  Browse All Perks
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-nfw-blackberry border-2 border-nfw-blackberry/20 font-bold text-lg hover:border-nfw-blackberry transition-all"
                >
                  Become a Member
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 pt-2 text-sm text-nfw-blackberry/50 font-medium">
                <span>1,000+ member-only deals</span>
                <span>New perks added weekly</span>
                <span>Save $500+ per year</span>
              </div>
            </div>
            <div className="relative">
              <div className="relative aspect-[4/3] border border-nfw-blackberry/10">
                <img
                  src="/images/microgrants-help.jpg"
                  alt="Everyday savings for women"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.style.background =
                      "#d4f1ad";
                  }}
                />
                <div className="absolute inset-0 bg-nfw-blackberry/50"></div>
                <div className="absolute bottom-5 left-5 bg-white/95 px-5 py-4 border border-nfw-blackberry/10">
                  <p className="text-2xl font-black text-nfw-blackberry font-serif">
                    $500+
                  </p>
                  <p className="text-xs text-nfw-blackberry/60 font-medium">
                    Average annual savings per member
                  </p>
                </div>
                <div className="absolute top-5 right-5 bg-nfw-citrine px-4 py-3 border border-nfw-blackberry/10">
                  <p className="text-xs font-black text-nfw-blackberry font-serif">
                    1,000+
                  </p>
                  <p className="text-xs text-nfw-blackberry/70">perks & discounts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-nfw-dove py-16 lg:py-24 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="font-serif text-4xl lg:text-6xl text-nfw-blackberry mb-2">
                Everyday savings you can feel
              </h2>
              <p className="text-nfw-blackberry/60">
                Members get access to fresh deals on things you already spend
                money on.
              </p>
            </div>
            <Link
              href="/perks"
              className="hidden sm:flex items-center gap-1 text-nfw-blackberry font-semibold text-sm hover:text-nfw-blackberry/70 transition-colors whitespace-nowrap ml-8"
            >
              Browse all perks
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-3 mb-8 scrollbar-hide">
            {categories.map((cat, i) => (
              <button
                key={cat}
                className={`px-4 py-1.5 whitespace-nowrap text-sm font-semibold transition-colors ${
                  i === 0
                    ? "bg-nfw-blackberry text-nfw-dove"
                    : "bg-white text-nfw-blackberry border border-nfw-blackberry/20 hover:bg-nfw-lilac/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {perks.map((perk) => (
              <div
                key={perk.name}
                className="group bg-white border border-nfw-blackberry/10 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span
                      className="inline-block text-xs px-2.5 py-1 mb-2 font-semibold"
                      style={{
                        backgroundColor: perk.color,
                        color: "#2d1239",
                      }}
                    >
                      {perk.category}
                    </span>
                    <h3 className="font-black text-nfw-blackberry text-base font-serif">
                      {perk.name}
                    </h3>
                  </div>
                  <div
                    className="w-10 h-10 flex-shrink-0 ml-3"
                    style={{ backgroundColor: perk.color }}
                  ></div>
                </div>
                <p className="text-sm text-nfw-blackberry/60 mb-3">{perk.value}</p>
                <Link
                  href="/perks"
                  className="text-xs font-semibold text-nfw-blackberry hover:text-nfw-blackberry/70 transition-colors"
                >
                  View details
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative bg-nfw-wisteria py-16 lg:py-24 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-widest mb-3 font-ui">
              Secure, simple and smart
            </p>
<h2 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight font-serif">
               How perks and discounts work
             </h2>
            <p className="text-white/70 text-lg">
              Getting savings should feel easy. Here is how you can use your
              perks today.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Browse and save",
                description:
                  "Explore deals on everyday essentials, wellness and more.",
                color: "bg-[#d4f1ad]",
              },
              {
                step: "02",
                title: "Activate your perk",
                description:
                  "Follow simple instructions to redeem your discount or offer.",
                color: "bg-nfw-citrine",
              },
              {
                step: "03",
                title: "Enjoy the savings",
                description:
                  "Stretch your budget with lower costs on things you already buy.",
                color: "bg-[#b2d1ee]",
              },
            ].map(({ step, title, description, color }) => (
              <div
                key={step}
                className="relative bg-white/40 p-8 border-2 border-white/50 text-center group"
              >
                <div className="absolute top-4 left-5 text-xs font-black text-nfw-blackberry/30">
                  {step}
                </div>
                <div
                  className={`inline-flex items-center justify-center w-20 h-20 ${color} mb-6 group-hover:scale-110 transition-all duration-300`}
                >
                  <Check className="w-8 h-8 text-nfw-blackberry" />
                </div>
                <h3 className="text-xl font-black text-nfw-blackberry mb-3 font-serif">
                  {title}
                </h3>
                <p className="text-nfw-blackberry/70">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative bg-nfw-dove py-16 lg:py-24 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-widest mb-3 font-ui">
                Made for real life
              </p>
              <h2 className="font-serif text-4xl lg:text-6xl text-nfw-blackberry mb-4 leading-tight">
                Why members love them
              </h2>
              <p className="text-lg text-nfw-blackberry/70 mb-8">
                Perks are built to make everyday life easier. Members use them
                to save money on the things they already buy, discover helpful
                offers and find small moments of relief throughout the week.
              </p>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center justify-center px-8 py-4 bg-nfw-citrine text-nfw-blackberry font-bold text-lg transition-all hover:bg-nfw-citrine/80"
              >
                Become a Member
              </Link>
            </div>
            <div className="space-y-4">
              {[
                {
                  color: "#d4f1ad",
                  check: "bg-[#d4f1ad]",
                  title: "Real savings you can feel",
                  description:
                    "Many members save more than their membership cost. Discounts on essentials help your budget stretch further.",
                },
                {
                  color: "#fdf493",
                  check: "bg-nfw-citrine",
                  title: "Helpful for everyday life",
                  description:
                    "Perks cover things you use every day like groceries, health items and childcare bringing quick relief when life feels busy.",
                },
                {
                  color: "#b2d1ee",
                  check: "bg-[#b2d1ee]",
                  title: "New deals added often",
                  description:
                    "Fresh offers are added throughout the month so there is always something helpful to claim and enjoy.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 p-6 border border-nfw-blackberry/10"
                  style={{ backgroundColor: `${item.color}25` }}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 ${item.check} flex items-center justify-center mt-0.5`}
                  >
                    <Check className="w-5 h-5 text-nfw-blackberry" />
                  </div>
                  <div>
                    <p className="font-black text-nfw-blackberry mb-1 font-serif">
                      {item.title}
                    </p>
                    <p className="text-sm text-nfw-blackberry/60">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-nfw-dove py-16 lg:py-24 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-widest mb-3 font-ui">
              What members are saying
            </p>
              <h2 className="font-serif text-4xl lg:text-6xl text-nfw-blackberry mb-4 leading-tight">
                Real stories from our community
              </h2>
            <p className="text-nfw-blackberry/60 text-lg">
              These everyday moments show how perks, savings and small bits of
              support can make life feel a little lighter.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white border border-nfw-blackberry/10 p-6"
              >
                <p className="text-nfw-blackberry/70 text-sm leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-nfw-lilac/40 flex items-center justify-center text-sm font-black text-nfw-blackberry">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-nfw-blackberry text-sm">{t.name}</p>
                    <p className="text-xs text-nfw-blackberry/50">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative bg-nfw-dove py-16 lg:py-24 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <h2 className="font-serif text-4xl lg:text-6xl text-nfw-blackberry">
                Small wins matter. Let&apos;s celebrate yours.
              </h2>
              <p className="text-lg text-nfw-blackberry/80">
                Stories, joy, and tiny moments of relief. Every day.
              </p>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center justify-center px-8 py-4 bg-nfw-citrine text-nfw-blackberry font-bold text-lg transition-all hover:bg-nfw-citrine/80"
              >
                Become a Member
              </Link>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <div className="aspect-square bg-nfw-lilac">
                    <img
                      src="/images/member-1.jpg"
                      alt="NFW Member"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                </div>
                <div className="relative mt-8">
                  <div className="aspect-square bg-nfw-citrine">
                    <img
                      src="/images/member-2.jpg"
                      alt="NFW Member"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                </div>
                <div className="relative -mt-4">
                  <div className="aspect-square bg-nfw-powder">
                    <img
                      src="/images/member-3.jpg"
                      alt="NFW Member"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                </div>
                <div className="relative">
                  <div className="aspect-square bg-nfw-lilac">
                    <img
                      src="/images/member-4.jpg"
                      alt="NFW Member"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-nfw-blackberry py-20 lg:py-32 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="font-serif text-4xl lg:text-6xl text-white mb-6">
            Trusted by women across the country.
          </h2>
          <p className="text-xl text-nfw-lilac mb-8 max-w-2xl mx-auto">
            From small towns to big cities, women are finding comfort,
            connection, and relief here.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
            {[
              {
                color: "bg-[#d4f1ad]",
                title: "1,000+ Perks",
                sub: "Across every category",
              },
              {
                color: "bg-nfw-citrine",
                title: "$500+ Saved",
                sub: "Average per member per year",
              },
              {
                color: "bg-[#b2d1ee]",
                title: "50 States",
                sub: "Women served nationwide",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 text-left"
              >
                <div
                  className={`flex-shrink-0 w-6 h-6 ${item.color} flex items-center justify-center mt-1`}
                >
                  <Check className="w-4 h-4 text-nfw-blackberry" />
                </div>
                <div>
                  <div className="text-white font-bold mb-1">{item.title}</div>
                  <div className="text-nfw-lilac text-sm">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center justify-center px-10 py-5 bg-nfw-citrine text-nfw-blackberry font-bold text-xl transition-all hover:bg-nfw-citrine/80"
          >
            Join a community that cares
          </Link>
          <p className="text-nfw-lilac text-sm mt-6">
            Already a member?{" "}
            <Link
              href="/perks"
              className="underline hover:text-white transition-colors"
            >
              Browse perks now
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
