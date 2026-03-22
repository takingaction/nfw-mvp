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
            emoji: "B",
          },
          {
            id: "2",
            name: "Vitamins & Supplements",
            category: "Health & Wellness",
            color: "#9CA6D2",
            emoji: "V",
          },
          {
            id: "3",
            name: "School Supplies Bundle",
            category: "Education",
            color: "#F8F19A",
            emoji: "S",
          },
          {
            id: "4",
            name: "Grocery Gift Card",
            category: "Food & Groceries",
            color: "#d4f1ad",
            emoji: "G",
          },
          {
            id: "5",
            name: "Personal Care Kit",
            category: "Personal Care",
            color: "#B693C0",
            emoji: "P",
          },
          {
            id: "6",
            name: "Home Essentials Set",
            category: "Home Essentials",
            color: "#9CA6D2",
            emoji: "H",
          },
        ];

  return (
    <main className="min-h-screen bg-nfw-dove">
      <div className="relative bg-nfw-dove overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-aubergine mb-6">
                Free items for NFW members — no catch
              </p>
              <h1 className="font-serif text-5xl lg:text-6xl xl:text-[63px] text-nfw-aubergine leading-[1.05]">
                Real items. Zero dollars.
              </h1>
              <p className="text-xl text-nfw-blackberry/70 max-w-lg leading-relaxed">
                The Zero Dollar Store is exclusively for NFW members. Browse
                real items — baby gear, groceries, health essentials, and more —
                and claim them for free. No strings attached.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href="/store"
                  className="inline-flex items-center justify-center px-8 py-4 bg-nfw-blackberry text-nfw-dove font-bold text-lg transition-all hover:bg-nfw-blackberry/90"
                >
                  Browse the Store
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-nfw-blackberry border-2 border-nfw-blackberry/20 font-bold text-lg hover:border-nfw-blackberry transition-all"
                >
                  Become a Member
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 pt-2 text-sm text-nfw-blackberry/50 font-medium">
                <span>New items added regularly</span>
                <span>Members only</span>
                <span>Shipped to your door</span>
              </div>
            </div>
            <div className="relative">
              <div className="relative aspect-[4/3] border border-nfw-blackberry/10">
                <img
                  src="/images/zero-dollar-store.jpg"
                  alt="Zero Dollar Store"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.style.background =
                      "#d4f1ad";
                  }}
                />
                <div className="absolute inset-0 bg-nfw-blackberry/50" />
                <div className="absolute bottom-5 left-5 bg-white/95 px-5 py-4 border border-nfw-blackberry/10">
                  <p className="text-2xl font-black text-nfw-blackberry font-serif">
                    $0
                  </p>
                  <p className="text-xs text-nfw-blackberry/60 font-medium">
                    Every item, every time
                  </p>
                </div>
                <div className="absolute top-5 right-5 bg-nfw-citrine px-4 py-3 border border-nfw-blackberry/10">
                  <p className="text-xs font-black text-nfw-blackberry font-serif">
                    Members
                  </p>
                  <p className="text-xs text-nfw-blackberry/70">only access</p>
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
              <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-2">
                What&apos;s in the store
              </h2>
              <p className="text-nfw-blackberry/60">
                A preview of what members can claim — new items added regularly.
              </p>
            </div>
            <Link
              href="/store"
              className="hidden sm:flex items-center gap-1 text-nfw-blackberry font-semibold text-sm hover:text-nfw-blackberry/70 transition-colors whitespace-nowrap ml-8"
            >
              Browse all items
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
            {previewItems.map((item) => (
              <div
                key={item.id}
                className="group bg-white border border-nfw-blackberry/10 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span
                      className="inline-block text-xs px-2.5 py-1 mb-2 font-semibold"
                      style={{
                        backgroundColor: `${item.color}40`,
                        color: "#2d1239",
                      }}
                    >
                      {item.category}
                    </span>
                    <h3 className="font-black text-nfw-blackberry text-base font-serif">
                      {item.name}
                    </h3>
                  </div>
                  <div
                    className="w-10 h-10 flex-shrink-0 ml-3 flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${item.color}50` }}
                  >
                    {item.emoji || "G"}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-nfw-blackberry font-serif">
                    $0.00
                  </span>
                  <Link
                    href="/store"
                    className="text-xs font-semibold text-nfw-blackberry hover:text-nfw-blackberry/70 transition-colors"
                  >
                    Claim now
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/store"
              className="inline-flex items-center justify-center px-8 py-4 bg-nfw-blackberry text-white font-bold text-lg hover:bg-nfw-blackberry/90 transition-all"
            >
              Browse All Items
            </Link>
          </div>
        </div>
      </div>

      <div className="relative bg-nfw-wisteria py-16 lg:py-24 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3 font-ui">
              Simple, fast, and free
            </p>
              <h2 className="font-serif text-4xl lg:text-6xl text-white mb-4 leading-tight">
                How the Zero Dollar Store works
              </h2>
            <p className="text-white/70 text-lg">
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
                color: "bg-[#d4f1ad]",
              },
              {
                step: "02",
                title: "Claim your item",
                description:
                  "Select what you need and claim it. One item at a time, while supplies last.",
                color: "bg-nfw-citrine",
              },
              {
                step: "03",
                title: "Receive it at your door",
                description:
                  "Your item ships directly to you. No payment, no hidden fees. Just a gift from NFW.",
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
                Made for real needs
              </p>
              <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-4 leading-tight">
                Why members love the store
              </h2>
              <p className="text-lg text-nfw-blackberry/70 mb-8">
                The Zero Dollar Store exists because sometimes you just need
                something and the budget isn&apos;t there. NFW members get
                access to real items that make a real difference.
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
                  className="flex items-start gap-4 p-6 border border-nfw-blackberry/10"
                  style={{ backgroundColor: `${item.color}25` }}
                >
                  <div
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: item.color }}
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
              <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-4 leading-tight">
                Real stories from our community
              </h2>
            <p className="text-nfw-blackberry/60 text-lg">
              These are real moments from women who found something they needed
              in the Zero Dollar Store.
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

      <div className="bg-nfw-blackberry py-20 lg:py-32 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="font-serif text-4xl lg:text-6xl text-white mb-6">
            Everything you need. Nothing to pay.
          </h2>
          <p className="text-xl text-nfw-lilac mb-8 max-w-2xl mx-auto">
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
                color: "bg-nfw-citrine",
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
            Join NFW — It&apos;s Free to Start
          </Link>
          <p className="text-nfw-lilac text-sm mt-6">
            Already a member?{" "}
            <Link
              href="/store"
              className="underline hover:text-white transition-colors"
            >
              Browse the store now
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
