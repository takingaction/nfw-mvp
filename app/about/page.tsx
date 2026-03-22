import Link from "next/link";

export const metadata = {
  title: "About Us",
  description:
    "A space to celebrate, listen, and uplift American women. Learn about the National Fund for Women mission.",
  openGraph: {
    title: "About Us | National Fund for Women",
    description: "A space to celebrate, listen, and uplift American women.",
    url: "https://nationalfundforwomen.org/about",
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630 }],
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-nfw-dove">
      {/* HERO */}
      <div className="bg-nfw-aubergine">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-dove mb-6">
            Our Story
          </p>
          <h1 className="font-serif text-4xl lg:text-6xl text-nfw-dove mb-6 leading-tight">
            Built by women. For women.
          </h1>
          <p className="font-serif text-xl text-nfw-dove max-w-2xl mx-auto">
            The National Fund for Women is a membership-based community that
            helps millions of women at the individual level and champions their
            shared interests.
          </p>
        </div>
      </div>

      {/* MISSION */}
      <div className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-3">
                Why we exist
              </p>
              <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-6 leading-tight">
                Real support for real life moments
              </h2>
              <p className="font-serif text-2xl text-nfw-blackberry/70 mb-4 leading-relaxed">
                Women across America are navigating rising costs, caregiving
                pressures, wage gaps, and unexpected emergencies — often without
                a safety net. NFW was created to change that.
              </p>
              <p className="font-serif text-2xl text-nfw-blackberry/70 mb-8 leading-relaxed">
                We believe that small, consistent support creates lasting
                change. Through microgrants, exclusive perks, and a community
                that truly gets it, we help women find relief — not someday, but
                today.
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
                  bg: "bg-nfw-citrine/20",
                  title: "Celebrate every woman",
                  description:
                    "We uplift and affirm all women — through daily life moments, feel-good content, and a community that champions your wins big and small.",
                },
                {
                  bg: "bg-nfw-lilac/20",
                  title: "Provide relief you can feel",
                  description:
                    "From microgrants to perks to the Zero Dollar Store, every benefit is designed to ease real pressure in your everyday life.",
                },
                {
                  bg: "bg-nfw-powder/20",
                  title: "Champion shared interests",
                  description:
                    "NFW advocates for women at the individual level and the collective level — because what's good for one woman is good for all of us.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className={`flex items-start gap-4 p-6 border border-nfw-blackberry/10 ${item.bg}`}
                >
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

      {/* WHO WE SERVE */}
      <div className="py-20 lg:py-28 bg-nfw-dove">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-3">
              Our community
            </p>
              <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-4 leading-tight">
                Women at every stage of life
              </h2>
            <p className="font-sans text-lg text-nfw-blackberry/60">
              NFW membership is open to all women 18 and older residing in the
              United States. We welcome women from all backgrounds and
              circumstances.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Young Women",
                age: "18-34",
                description:
                  "Navigating cost of living, student debt, and building a future in a complicated world.",
                color: "#fdf493",
              },
              {
                title: "Moms of Young Kids",
                age: "All ages",
                description:
                  "Balancing childcare costs, limited time, and the daily demands of raising a family.",
                color: "#d4f1ad",
              },
              {
                title: "Moms of Older Kids",
                age: "Gen X",
                description:
                  "Managing college prep, work-life balance, and caring for loved ones all at once.",
                color: "#b2d1ee",
              },
              {
                title: "Grandmas and Elders",
                age: "55+",
                description:
                  "Living on fixed incomes while supporting the next generation and leaving a legacy.",
                color: "#bcafcf",
              },
            ].map((group) => (
              <div
                key={group.title}
                className="bg-nfw-dove border border-nfw-blackberry/10 p-6"
              >
                <div
                  className="w-12 h-12 mb-4"
                  style={{ backgroundColor: `${group.color}50` }}
                ></div>
                <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-1">
                  {group.age}
                </p>
                <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-2">
                  {group.title}
                </h3>
                <p className="font-sans text-sm text-nfw-blackberry/60">{group.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHAT WE OFFER */}
      <div className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-3">
              What membership includes
            </p>
              <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-4 leading-tight">
                Everything you need. Nothing you don&apos;t.
              </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Microgrants",
                description:
                  "Apply for grants from $100 to $5,000 to cover emergency bills, childcare, medical costs, car repairs, and more. Real people review every application within 48 hours.",
                color: "#d4f1ad",
                link: "/grants",
                cta: "Learn about grants",
              },
              {
                title: "Perks and Discounts",
                description:
                  "Access 1,000+ member-only deals on groceries, wellness, travel, childcare, and everyday essentials. Members save an average of $500+ per year.",
                color: "#b2d1ee",
                link: "/perks/info",
                cta: "Explore perks",
              },
              {
                title: "Zero Dollar Store",
                description:
                  "Claim free essential items whenever you need them — hygiene products, household items, and more. No questions asked, no judgment.",
                color: "#fdf493",
                link: "/store",
                cta: "Visit the store",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border border-nfw-blackberry/10 p-8"
              >
                <div
                  className="w-14 h-14 mb-6"
                  style={{ backgroundColor: `${item.color}50` }}
                ></div>
                <h3 className="font-ui text-sm font-black tracking-[0.06em] uppercase text-nfw-blackberry mb-3">
                  {item.title}
                </h3>
                <p className="font-sans text-nfw-blackberry/60 mb-6 leading-relaxed">
                  {item.description}
                </p>
                <Link
                  href={item.link}
                  className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-aubergine hover:underline"
                >
                  {item.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="bg-nfw-wisteria py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {[
              { value: "50K+", label: "Active Members" },
              { value: "$2.5M+", label: "Grants Awarded" },
              { value: "50", label: "States Represented" },
              { value: "1,000+", label: "Perks and Discounts" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-serif text-5xl lg:text-6xl font-bold text-nfw-dove mb-2">
                  {stat.value}
                </div>
                <div className="font-ui text-sm font-medium text-nfw-dove/60 tracking-wide uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="bg-nfw-blackberry py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-4xl lg:text-6xl text-nfw-dove mb-6">
            Feel supported. Feel empowered.
          </h2>
          <p className="font-serif text-2xl text-nfw-dove mb-8 max-w-2xl mx-auto">
            Join thousands of women who have already found relief, connection,
            and real support through NFW.
          </p>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center justify-center px-10 py-5 bg-nfw-citrine text-nfw-blackberry font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
          >
            Become a Member Today
          </Link>
          <p className="font-sans text-sm text-nfw-lilac mt-6">
            Free to join. Upgrade anytime.
          </p>
        </div>
      </div>
    </main>
  );
}
