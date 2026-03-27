"use client";

import Link from "next/link";
import Image from "next/image";
import { FileText, Eye, Banknote } from "lucide-react";

export default function MicrograntsPage() {
  return (
    <main className="min-h-screen bg-nfw-dove">
      {/* HERO */}
      <div className="bg-nfw-dove">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-aubergine mb-6">
                Now Accepting Applications
              </p>
              <h1 className="font-serif text-5xl lg:text-6xl xl:text-[63px] text-nfw-aubergine leading-[1.05]">
                For the moments that matter.
              </h1>
              <p className="font-serif text-2xl text-nfw-blackberry/70 max-w-lg leading-relaxed">
                Microgrants from $100 to $5,000 for bills, essentials, and
                unexpected costs. Simple to apply. Fast to receive.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href="/grants/apply"
                  className="inline-flex items-center justify-center px-8 py-4 bg-nfw-aubergine text-nfw-dove font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors"
                >
                  Apply Today
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-nfw-blackberry border-2 border-nfw-blackberry/20 font-ui font-black text-sm tracking-[0.06em] uppercase hover:border-nfw-blackberry transition-colors"
                >
                  Become a Member
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 pt-2 font-sans text-sm text-nfw-blackberry/50 font-medium">
                <span>Real people review every application</span>
                <span>Decisions within 48 hours</span>
                <span>50 states served</span>
              </div>
            </div>
            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src="/images/microgrants-help.jpg"
                  alt="Women receiving microgrant support"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-nfw-blackberry/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-5 left-5 bg-white/95 px-5 py-4">
                  <p className="font-ui text-2xl font-black text-nfw-blackberry tracking-[0.03em] uppercase">
                    $2.5M+
                  </p>
                  <p className="font-sans text-xs text-nfw-blackberry/60">
                    Grants awarded to women nationwide
                  </p>
                </div>
                <div className="absolute top-5 right-5 bg-nfw-citrine px-4 py-3">
                  <p className="font-ui text-xs font-black text-nfw-blackberry tracking-[0.03em] uppercase">
                    $100 – $5,000
                  </p>
                  <p className="font-sans text-xs text-nfw-blackberry/70">per grant</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GRANTS GRID */}
      <div className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-4 leading-tight">
              Grants that help with real-life needs
            </h2>
            <p className="font-serif text-2xl text-nfw-blackberry/70">
              Explore microgrants that cover emergencies, essentials, and the
              moments when life gets heavy.
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-3 mb-10 justify-center flex-wrap">
            {[
              "All",
              "Childcare",
              "Emergency Bills",
              "Groceries",
              "Medical",
              "Transportation",
              "Small Business",
            ].map((pill, i) => (
              <button
                key={pill}
                className={`px-4 py-1.5 whitespace-nowrap font-ui text-xs font-black tracking-[0.06em] uppercase transition-colors ${
                  i === 0 
                    ? "bg-nfw-aubergine text-nfw-dove" 
                    : "bg-white text-nfw-blackberry border border-nfw-blackberry/20 hover:bg-nfw-lilac/20"
                }`}
              >
                {pill}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "$750 Healthcare Support",
                description:
                  "Supports medical appointments, prescriptions, or urgent health costs that pop up when you least need them.",
                closing: "Closing Dec 31, 2026",
                partner: null,
              },
              {
                title: "$100 Rainy Day Fund",
                description:
                  "Quick relief for unexpected expenses — a bill, a co-pay, or anything that caught you off guard this month.",
                closing: "Closing Dec 31, 2026",
                partner: null,
              },
              {
                title: "$300 Essentials Grant",
                description:
                  "Helps with groceries, home basics, or a week's worth of essentials during a tight month.",
                closing: "Closing Feb 8, 2026",
                partner: "Synergy",
              },
              {
                title: "$5,000 Small Business Starter",
                description:
                  "Provides seed funding for supplies, tools, or equipment to grow or launch a small business idea.",
                closing: "Closing Jan 11, 2027",
                partner: "Subaru",
              },
              {
                title: "$2,500 Mobility and Work Grant",
                description:
                  "Helps with transportation, job training, certifications, or anything that moves you forward.",
                closing: "Closing Jan 3, 2027",
                partner: null,
              },
              {
                title: "$500 Childcare Support",
                description:
                  "Covers childcare, school fees, or after-school care so it's easier to work or keep appointments.",
                closing: "Closing Jan 11, 2027",
                partner: "Phoenix",
              },
            ].map((grant) => (
              <div
                key={grant.title}
                className="bg-white border border-nfw-blackberry/10 overflow-hidden"
              >
                <div className="relative h-44 overflow-hidden bg-nfw-lilac/20">
                  <Image
                    src="/images/microgrants-help.jpg"
                    alt={grant.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    loading="lazy"
                  />
                  {grant.partner && (
                    <div className="absolute bottom-3 left-3 bg-white/90 px-2 py-1 font-ui text-xs font-black tracking-[0.03em] uppercase text-nfw-blackberry">
                      In Partnership with {grant.partner}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <p className="font-sans text-xs text-nfw-blackberry/40 mb-2">
                    {grant.closing}
                  </p>
                  <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-2">
                    {grant.title}
                  </h3>
                  <p className="font-sans text-sm text-nfw-blackberry/60 mb-4 line-clamp-2">
                    {grant.description}
                  </p>
                  <Link
                    href="/grants/apply"
                    className="inline-flex items-center gap-1 font-sans text-sm font-medium text-nfw-aubergine hover:text-nfw-blackberry transition-colors"
                  >
                    Apply today
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="bg-nfw-wisteria py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-dove/60 mb-3">
              Secure, simple and smart
            </p>
            <h2 className="font-serif text-4xl lg:text-6xl text-nfw-dove mb-4 leading-tight">
              How the microgrant process works
            </h2>
            <p className="font-serif text-2xl text-nfw-dove/70">
              Getting support should feel simple. Here is what to expect when
              you apply.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                Icon: FileText,
                title: "Apply in a few minutes",
                description:
                  "Share the basics of your situation in a short, simple form. No lengthy paperwork.",
              },
              {
                step: "02",
                Icon: Eye,
                title: "We review your request",
                description:
                  "A real person looks at your application with care. Most reviews happen within 48 hours.",
              },
              {
                step: "03",
                Icon: Banknote,
                title: "Funds are sent securely",
                description:
                  "If approved, your grant is delivered by bank transfer or digital wallet — fast.",
              },
            ].map(({ step, Icon, title, description }) => (
              <div
                key={step}
                className="relative bg-white/40 p-8 border border-white/50 text-center"
              >
                <div className="absolute top-4 left-5 font-ui text-xs font-black text-white/30">
                  {step}
                </div>
                <div className="inline-flex items-center justify-center w-20 h-20 bg-nfw-citrine mb-6">
                  <Icon className="w-10 h-10 text-nfw-blackberry" />
                </div>
                <h3 className="font-ui text-sm font-black tracking-[0.06em] uppercase text-white mb-3">
                  {title}
                </h3>
                <p className="font-serif text-white/70">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW MUCH YOU CAN RECEIVE */}
      <div className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-3">
                Grant Amounts
              </p>
              <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-4 leading-tight">
                How much you can receive
              </h2>
              <p className="font-serif text-2xl text-nfw-blackberry/70 mb-8">
                Microgrants come in different amounts depending on your need —
                all designed to give you quick, meaningful relief.
              </p>
              <Link
                href="/grants/apply"
                className="inline-flex items-center justify-center px-8 py-4 bg-nfw-citrine text-nfw-blackberry font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
              >
                Apply Today
              </Link>
            </div>
            <div className="space-y-4">
              {[
                {
                  range: "$100 – $500",
                  label: "Emergency Grants",
                  description:
                    "Urgent needs like utility payments, transit to work, childcare gaps, or groceries.",
                  bg: "bg-nfw-powder/20",
                },
                {
                  range: "$500 – $2,500",
                  label: "Stability Grants",
                  description:
                    "Housing deposits, certifications, or medical expenses not covered by insurance.",
                  bg: "bg-nfw-citrine/20",
                },
                {
                  range: "$2,500 – $5,000",
                  label: "Business and Growth Grants",
                  description:
                    "A boost to help you start or grow a small business idea with real potential.",
                  bg: "bg-nfw-lilac/20",
                },
              ].map((tier) => (
                <div
                  key={tier.range}
                  className={`flex items-start gap-4 p-6 border border-nfw-blackberry/10 ${tier.bg}`}
                >
                  <div>
                    <p className="font-ui text-lg font-black tracking-[0.03em] uppercase text-nfw-blackberry">
                      {tier.range}{" "}
                      <span className="font-sans font-medium text-base">
                        {tier.label}
                      </span>
                    </p>
                    <p className="font-sans text-sm text-nfw-blackberry/60 mt-1">
                      {tier.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS STORIES */}
      <div className="py-20 lg:py-28 bg-nfw-dove">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-2">
                Small wins matter
              </p>
              <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine leading-tight">
                Success Stories and Everyday Wins
              </h2>
              <p className="font-serif text-2xl text-nfw-blackberry/60 mt-2">
                Feel-good moments from women supporting women.
              </p>
            </div>
            <Link
              href="/articles"
              className="hidden sm:flex items-center gap-1 font-sans text-sm font-medium text-nfw-aubergine hover:text-nfw-blackberry transition-colors whitespace-nowrap"
            >
              See all stories
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                category: "Everyday Expense",
                bg: "bg-nfw-citrine/20",
                title: "A microgrant helped me fix my car and get back to work",
              },
              {
                category: "Parenting",
                bg: "bg-nfw-powder/20",
                title: "Covering an unexpected bill gave me room to breathe",
              },
              {
                category: "Medical Support",
                bg: "bg-nfw-lilac/20",
                title: "Getting support for medical costs eased so much stress",
              },
            ].map((story) => (
              <div
                key={story.title}
                className="bg-nfw-dove border border-nfw-blackberry/10 overflow-hidden"
              >
                <div
                  className="relative h-48 overflow-hidden"
                >
                  <Image
                    src="/images/microgrants-help.jpg"
                    alt={story.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <span
                    className={`inline-block font-ui text-xs font-black tracking-[0.06em] uppercase px-2.5 py-1 mb-3 ${story.bg}`}
                  >
                    {story.category}
                  </span>
                  <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-3 line-clamp-2">
                    {story.title}
                  </h3>
                  <Link
                    href="/articles"
                    className="font-sans text-sm font-medium text-nfw-aubergine hover:text-nfw-blackberry transition-colors"
                  >
                    Read more
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="bg-nfw-aubergine py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-4xl lg:text-6xl text-nfw-dove mb-6">
            Ready to get the support you deserve?
          </h2>
          <p className="font-serif text-2xl text-nfw-dove mb-8 max-w-2xl mx-auto">
            Join thousands of women who have already found relief through NFW
            microgrants. Your application takes just a few minutes.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
            {[
              {
                bg: "bg-nfw-citrine/20",
                title: "Quick Application",
                sub: "Takes just a few minutes",
              },
              {
                bg: "bg-nfw-citrine/20",
                title: "Fast Review",
                sub: "Decisions within 48 hours",
              },
              {
                bg: "bg-nfw-citrine/20",
                title: "Secure Funds",
                sub: "Sent directly to you",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 text-left"
              >
                <div
                  className={`flex-shrink-0 w-6 h-6 ${item.bg} flex items-center justify-center mt-1`}
                >
                </div>
                <div>
                  <div className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-dove mb-1">{item.title}</div>
                  <div className="font-sans text-sm text-nfw-lilac">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/grants/apply"
            className="inline-flex items-center justify-center px-10 py-5 bg-nfw-citrine text-nfw-blackberry font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
          >
            Apply for a Microgrant Today
          </Link>
          <p className="font-sans text-sm text-nfw-lilac mt-6">
            Membership required to apply.{" "}
            <Link
              href="/auth/sign-up"
              className="underline hover:text-white transition-colors"
            >
              Join free today
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
