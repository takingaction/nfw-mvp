"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState, useEffect } from "react";

const testimonials = [
  {
    quote:
      "I couldn't believe it was free. I got a stroller for my baby and didn't pay a cent. NFW changed everything for us.",
    name: "Keisha, 28",
    role: "Home Health Aide",
  },
  {
    quote:
      "The Zero Dollar Store helped me get school supplies for my kids when I had nothing left in my budget.",
    name: "Carmen, 35",
    role: "Restaurant Worker",
  },
  {
    quote:
      "I claimed a baby monitor I desperately needed. It arrived in two days. I cried happy tears.",
    name: "Amara, 31",
    role: "Nursing Student",
  },
  {
    quote:
      "Free items that actually matter — not junk. Real things women need every day.",
    name: "Diane, 44",
    role: "Administrative Assistant",
  },
  {
    quote:
      "I was skeptical at first but it's real. I've claimed three items and every one arrived as described.",
    name: "Priya, 38",
    role: "Childcare Worker",
  },
  {
    quote:
      "This is the most generous thing I've ever been part of. I tell every woman I know about it.",
    name: "Tanya, 52",
    role: "Retired Teacher",
  },
];

const categories = [
  "All",
  "Baby & Kids",
  "Health & Wellness",
  "Home Essentials",
  "Food & Groceries",
  "Education",
  "Personal Care",
];

export default function ZeroDollarStoreInfoPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch("/api/store/preview");
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } catch {
        // silently fail — fallback items shown below
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  // Fallback preview items if API fails or returns empty
  const previewItems =
    items.length > 0
      ? items.slice(0, 6)
      : [
          {
            id: "1",
            name: "Baby Monitor",
            category: "Baby & Kids",
            color: "#d4f1ad",
            emoji: "👶",
          },
          {
            id: "2",
            name: "Vitamins & Supplements",
            category: "Health & Wellness",
            color: "#b2d1ee",
            emoji: "💊",
          },
          {
            id: "3",
            name: "School Supplies Bundle",
            category: "Education",
            color: "#fdf493",
            emoji: "📚",
          },
          {
            id: "4",
            name: "Grocery Gift Card",
            category: "Food & Groceries",
            color: "#d4f1ad",
            emoji: "🛒",
          },
          {
            id: "5",
            name: "Personal Care Kit",
            category: "Personal Care",
            color: "#bcafcf",
            emoji: "🧴",
          },
          {
            id: "6",
            name: "Home Essentials Set",
            category: "Home Essentials",
            color: "#b2d1ee",
            emoji: "🏠",
          },
        ];

  return (
    <main className="min-h-screen bg-white">
      {/* HERO */}
      <div className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-64 h-64 bg-[#d4f1ad] rounded-full opacity-20 blur-3xl" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-[#bcafcf] rounded-full opacity-20 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2d1239]/10 border border-[#2d1239]/20 rounded-full text-sm">
                <span className="w-2 h-2 bg-[#d4f1ad] rounded-full" />
                <span className="text-[#2d1239] font-semibold">
                  Free items for NFW members — no catch
                </span>
              </div>
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#2d1239] leading-[1.05]"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Real items.
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10">Zero</span>
                  <span className="absolute bottom-1 left-0 w-full h-4 bg-[#fdf493] -z-0 opacity-60" />
                </span>{" "}
                dollars.
              </h1>
              <p className="text-xl text-[#2d1239]/70 max-w-lg leading-relaxed">
                The Zero Dollar Store is exclusively for NFW members. Browse
                real items — baby gear, groceries, health essentials, and more —
                and claim them for free. No strings attached.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href="/store"
                  className="inline-flex items-center justify-center px-8 py-4 bg-[#2d1239] text-[#fffef1] rounded-xl font-bold text-lg transition-all shadow-lg hover:bg-[#2d1239]/90"
                >
                  Browse the Store →
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#2d1239] border-2 border-[#2d1239]/20 rounded-xl font-bold text-lg hover:border-[#2d1239] transition-all"
                >
                  Become a Member
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 pt-2 text-sm text-[#2d1239]/50 font-medium">
                <span>✦ New items added regularly</span>
                <span>✦ Members only</span>
                <span>✦ Shipped to your door</span>
              </div>
            </div>
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl">
                <img
                  src="/images/zero-dollar-store.jpg"
                  alt="Zero Dollar Store"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.style.background =
                      "linear-gradient(135deg, #d4f1ad 0%, #bcafcf 100%)";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2d1239]/50 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-4 shadow-xl">
                  <p
                    className="text-2xl font-black text-[#2d1239]"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    $0
                  </p>
                  <p className="text-xs text-[#2d1239]/60 font-medium">
                    Every item, every time
                  </p>
                </div>
                <div className="absolute top-5 right-5 bg-[#fdf493] rounded-2xl px-4 py-3 shadow-lg">
                  <p
                    className="text-xs font-black text-[#2d1239]"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    Members
                  </p>
                  <p className="text-xs text-[#2d1239]/70">only access</p>
                </div>
              </div>
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-[#bcafcf] rounded-full opacity-50" />
              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-[#d4f1ad] rounded-full opacity-60" />
            </div>
          </div>
        </div>
      </div>

      {/* PREVIEW ITEMS */}
      <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-15 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-15 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2
                className="text-3xl sm:text-4xl font-black text-[#2d1239] mb-2"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                What&apos;s in the store
              </h2>
              <p className="text-[#2d1239]/60">
                A preview of what members can claim — new items added regularly.
              </p>
            </div>
            <Link
              href="/store"
              className="hidden sm:flex items-center gap-1 text-[#2d1239] font-semibold text-sm hover:text-[#2d1239]/70 transition-colors whitespace-nowrap ml-8"
            >
              Browse all items →
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-3 mb-8 scrollbar-hide">
            {categories.map((cat, i) => (
              <button
                key={cat}
                className={`px-4 py-1.5 rounded-full whitespace-nowrap text-sm font-semibold transition-colors ${
                  i === 0
                    ? "bg-[#2d1239] text-[#fffef1]"
                    : "bg-white text-[#2d1239] border border-[#2d1239]/20 hover:bg-[#bcafcf]/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {previewItems.map((item) => (
              <div
                key={item.id}
                className="group bg-white rounded-2xl border border-[#2d1239]/10 p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span
                      className="inline-block text-xs px-2.5 py-1 rounded-full mb-2 font-semibold"
                      style={{
                        backgroundColor: `${item.color}40`,
                        color: "#2d1239",
                      }}
                    >
                      {item.category}
                    </span>
                    <h3
                      className="font-black text-[#2d1239] text-base"
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      {item.name}
                    </h3>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex-shrink-0 ml-3 flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${item.color}50` }}
                  >
                    {item.emoji || "🎁"}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-lg font-black text-[#2d1239]"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    $0.00
                  </span>
                  <Link
                    href="/store"
                    className="text-xs font-semibold text-[#2d1239] hover:text-[#2d1239]/70 transition-colors"
                  >
                    Claim now →
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/store"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#2d1239] text-white rounded-xl font-bold text-lg hover:bg-[#2d1239]/90 transition-all shadow-lg"
            >
              Browse All Items →
            </Link>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="relative bg-[#bcafcf] py-16 lg:py-24 overflow-hidden">
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none rotate-180">
          <svg
            className="relative block w-full h-16"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
              fill="white"
            />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-semibold text-[#2d1239]/50 uppercase tracking-widest mb-3">
              Simple, fast, and free
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              How the Zero
              <br />
              Dollar Store works
            </h2>
            <p className="text-[#2d1239]/70 text-lg">
              Claiming a free item should feel easy. Here&apos;s how it works.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Browse available items",
                description:
                  "Explore what's currently in the store — from baby gear to groceries to health essentials.",
                color: "from-[#d4f1ad] to-[#b2d1ee]",
                icon: "🛍️",
              },
              {
                step: "02",
                title: "Claim your item",
                description:
                  "Select what you need and claim it. One item at a time, while supplies last.",
                color: "from-[#fdf493] to-[#d4f1ad]",
                icon: "✅",
              },
              {
                step: "03",
                title: "Receive it at your door",
                description:
                  "Your item ships directly to you. No payment, no hidden fees. Just a gift from NFW.",
                color: "from-[#b2d1ee] to-[#bcafcf]",
                icon: "📦",
              },
            ].map(({ step, title, description, color, icon }) => (
              <div
                key={step}
                className="relative bg-white/40 backdrop-blur-md rounded-3xl p-8 border-2 border-white/50 shadow-xl text-center group"
              >
                <div className="absolute top-4 left-5 text-xs font-black text-[#2d1239]/30">
                  {step}
                </div>
                <div
                  className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${color} rounded-full mb-6 shadow-lg group-hover:scale-110 transition-all duration-300 text-3xl`}
                >
                  {icon}
                </div>
                <h3
                  className="text-xl font-black text-[#2d1239] mb-3"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {title}
                </h3>
                <p className="text-[#2d1239]/70">{description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg
            className="relative block w-full h-16"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
              fill="white"
            />
          </svg>
        </div>
      </div>

      {/* WHY MEMBERS LOVE IT */}
      <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-3">
                Made for real needs
              </p>
              <h2
                className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Why members
                <br />
                love the store
              </h2>
              <p className="text-lg text-[#2d1239]/70 mb-8">
                The Zero Dollar Store exists because sometimes you just need
                something and the budget isn&apos;t there. NFW members get
                access to real items that make a real difference.
              </p>
              <Link
                href="/auth/sign-up"
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative">Become a Member</span>
              </Link>
            </div>
            <div className="space-y-4">
              {[
                {
                  color: "#d4f1ad",
                  title: "Real items, not samples",
                  description:
                    "Everything in the store is a full-size, useful item — not promotional samples or junk.",
                },
                {
                  color: "#fdf493",
                  title: "No hidden costs ever",
                  description:
                    "Zero dollars means zero dollars. No shipping fees, no handling charges, no surprises.",
                },
                {
                  color: "#b2d1ee",
                  title: "New items added regularly",
                  description:
                    "The store refreshes with new items so there's always something worth checking back for.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 p-6 rounded-2xl border border-[#2d1239]/10 hover:shadow-md transition-all"
                  style={{ backgroundColor: `${item.color}25` }}
                >
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: item.color }}
                  >
                    <Check className="w-5 h-5 text-[#2d1239]" />
                  </div>
                  <div>
                    <p
                      className="font-black text-[#2d1239] mb-1"
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      {item.title}
                    </p>
                    <p className="text-sm text-[#2d1239]/60">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div className="relative bg-[#f8f7fa] py-16 lg:py-24 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-3">
              What members are saying
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Real stories from
              <br />
              our community
            </h2>
            <p className="text-[#2d1239]/60 text-lg">
              These are real moments from women who found something they needed
              in the Zero Dollar Store.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-2xl border border-[#2d1239]/10 p-6 hover:shadow-lg transition-all duration-300"
              >
                <p className="text-[#2d1239]/70 text-sm leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#bcafcf]/40 flex items-center justify-center text-sm font-black text-[#2d1239]">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-[#2d1239] text-sm">{t.name}</p>
                    <p className="text-xs text-[#2d1239]/50">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="bg-gradient-to-br from-[#2d1239] to-[#4a1f5c] py-20 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-10 w-64 h-64 bg-[#fdf493] rounded-full opacity-10 blur-3xl" />
          <div className="absolute bottom-20 left-10 w-64 h-64 bg-[#d4f1ad] rounded-full opacity-10 blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Everything you need.
            <br />
            <span className="text-[#fdf493]">Nothing to pay.</span>
          </h2>
          <p className="text-xl text-[#bcafcf] mb-8 max-w-2xl mx-auto">
            The Zero Dollar Store is one of many ways NFW supports women across
            the country. Become a member to get access.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
            {[
              {
                color: "bg-[#d4f1ad]",
                title: "Free Items",
                sub: "No cost, ever",
              },
              {
                color: "bg-[#fdf493]",
                title: "Ships to You",
                sub: "Delivered to your door",
              },
              {
                color: "bg-[#b2d1ee]",
                title: "Members Only",
                sub: "Exclusive access",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 text-left"
              >
                <div
                  className={`flex-shrink-0 w-6 h-6 ${item.color} rounded-full flex items-center justify-center mt-1`}
                >
                  <Check className="w-4 h-4 text-[#2d1239]" />
                </div>
                <div>
                  <div className="text-white font-bold mb-1">{item.title}</div>
                  <div className="text-[#bcafcf] text-sm">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/auth/sign-up"
            className="group relative inline-flex items-center justify-center px-10 py-5 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-xl overflow-hidden transition-all shadow-2xl"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative">
              Join NFW — It&apos;s Free to Start →
            </span>
          </Link>
          <p className="text-[#bcafcf] text-sm mt-6">
            Already a member?{" "}
            <Link
              href="/store"
              className="underline hover:text-white transition-colors"
            >
              Browse the store now →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
