"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    category: "Getting Started",
    questions: [
      {
        question: "What is the National Fund for Women?",
        answer:
          "NFW is a membership-based community that helps American women at the individual level through direct financial support, exclusive savings, and a community that truly gets it. We offer microgrants, a perks & discounts platform, and the Zero Dollar Store — all designed to provide real relief for real life moments.",
      },
      {
        question: "Who can join NFW?",
        answer:
          "NFW membership is open to all women 18 and older residing in the United States. We welcome women from all backgrounds, income levels, and circumstances. Whether you're a young woman just starting out, a mom juggling it all, or a grandmother on a fixed income — there's a place for you here.",
      },
      {
        question: "How do I join?",
        answer:
          "Simply create a free account at nfw.org. Sign up takes just a few minutes — no credit card required to get started. Once you're in, you can explore all the benefits and choose a paid membership tier whenever you're ready.",
      },
      {
        question: "Is there a free membership option?",
        answer:
          "Yes! Free membership gives you access to the NFW community, our monthly newsletter, event notifications, and member articles & resources. It's a great way to get started and see if NFW is right for you before upgrading.",
      },
    ],
  },
  {
    category: "Membership and Pricing",
    questions: [
      {
        question: "How much does membership cost?",
        answer:
          "NFW membership starts free. A Contributing Membership is $15/year and unlocks microgrants, the perks & discounts platform, the Zero Dollar Store, and voting rights. A Founding Membership is $100/year and includes everything in Contributing, plus founding member recognition, priority grant review, and direct input on NFW initiatives. Visit our Pricing page to compare all plans.",
      },
      {
        question: "What do I get with a Contributing Membership?",
        answer:
          "For just $15/year — that's about $1.25/month — you get access to microgrant applications (up to $1,000), 1,000+ member perks & discounts, the Zero Dollar Store, voting rights on NFW initiatives, and a member badge. Most members save far more than $15 in their first month through the perks platform alone.",
      },
      {
        question: "Can I cancel my membership anytime?",
        answer:
          "Absolutely. You can cancel at any time with no cancellation fees and no questions asked. Your benefits will continue until the end of your current billing period. We're confident you'll love being a member, but we never want you to feel locked in.",
      },
      {
        question: "Can I upgrade or downgrade my membership?",
        answer:
          "Yes, you can upgrade or downgrade your membership at any time through your account settings. Changes take effect at the start of your next billing period.",
      },
    ],
  },
  {
    category: "Microgrants",
    questions: [
      {
        question: "How do microgrants work?",
        answer:
          "Contributing and Founding members can apply for microgrants ranging from $100 to $5,000 to help with real-life needs — emergency bills, childcare, medical costs, car repairs, groceries, and more. Applications are short and simple. A real person reviews every application, and most decisions are made within 48 hours. If approved, funds are sent directly to you by bank transfer or digital wallet.",
      },
      {
        question: "How much can I apply for?",
        answer:
          "Microgrants range from $100 to $5,000 depending on your need. Emergency grants ($100–$500) cover urgent everyday needs. Stability grants ($500–$2,500) help with larger expenses like housing deposits or medical bills. Business & growth grants ($2,500–$5,000) support women starting or growing a small business.",
      },
      {
        question: "How long does the application take?",
        answer:
          "The application is short and designed to take just a few minutes. You'll share the basics of your situation and what you need support with. No lengthy paperwork, no judgment.",
      },
      {
        question: "How quickly will I hear back?",
        answer:
          "Most applications are reviewed within 48 hours. If approved, funds are typically sent within a few business days. We know that when you need help, you need it fast — that's why we've built our process to move quickly.",
      },
      {
        question: "What if my application is not approved?",
        answer:
          "Not every application can be funded in every cycle, but that doesn't mean your situation doesn't matter. You're welcome to apply again in the next grant cycle. We're always working to grow our fund so we can help more women.",
      },
    ],
  },
  {
    category: "Perks and Discounts",
    questions: [
      {
        question: "What kinds of perks are available?",
        answer:
          "Members get access to 1,000+ deals across categories including groceries, health & wellness, childcare, travel, entertainment, insurance, technology, and more. Brands include HelloFresh, ClassPass, Ancestry, Skillshare, Lyft, Care.com, CVS, and many others. New deals are added regularly.",
      },
      {
        question: "How much can I save with the perks platform?",
        answer:
          "Members save an average of $500+ per year through the perks platform. Many members save more than the cost of their annual membership in their very first month. Discounts range from 5% to 60% off depending on the offer.",
      },
      {
        question: "How do I redeem a perk?",
        answer:
          "Browse the perks platform, find an offer you want, and follow the simple redemption instructions. Depending on the offer, you'll either click a link, use a code, show a coupon in-store, or call a number. It's designed to be quick and easy.",
      },
    ],
  },
  {
    category: "Zero Dollar Store",
    questions: [
      {
        question: "What is the Zero Dollar Store?",
        answer:
          "The Zero Dollar Store is our free marketplace where members can claim essential items at no cost — hygiene products, household items, and more. Items are restocked regularly. No questions asked, no judgment. It's one of our favorite benefits because it meets women exactly where they are.",
      },
      {
        question: "How often is the Zero Dollar Store restocked?",
        answer:
          "The store is restocked regularly with new items. We recommend checking back often so you don't miss something you need.",
      },
    ],
  },
  {
    category: "Privacy and Trust",
    questions: [
      {
        question: "Is my personal information safe?",
        answer:
          "Yes. We take your privacy seriously. Your personal information is never sold to third parties. We use industry-standard security practices to protect your data, and you're always in control of what you share.",
      },
      {
        question: "Do I have to share my income or personal details to join?",
        answer:
          "Basic membership requires only your name and email. Some benefits like microgrants may ask for additional context to help us understand your situation and match you with the right support. You're always in control of what you share.",
      },
      {
        question: "Is NFW a nonprofit?",
        answer:
          "NFW is a mission-driven organization dedicated to supporting American women. Every membership dollar goes toward funding microgrants, building the perks platform, and advocating for women across the country.",
      },
    ],
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "0-0": true,
  });

  const toggle = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main className="min-h-screen bg-nfw-dove">
      {/* HERO */}
      <div className="bg-nfw-aubergine">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-dove mb-6">
            We&apos;ve got answers
          </p>
          <h1 className="font-serif text-4xl lg:text-6xl text-nfw-dove mb-6 leading-tight">
            Questions? We&apos;ve got answers.
          </h1>
          <p className="font-serif text-xl text-nfw-dove max-w-2xl mx-auto">
            Everything you need to know about NFW membership, microgrants,
            perks, and more.
          </p>
        </div>
      </div>

      {/* FAQ SECTIONS */}
      <div className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {faqs.map((section, sectionIndex) => (
              <div key={section.category}>
                <h2 className="font-serif text-lg font-black tracking-[0.06em] uppercase text-nfw-aubergine mb-6">
                  {section.category}
                </h2>
                <div className="space-y-0">
                  {section.questions.map((faq, questionIndex) => {
                    const key = `${sectionIndex}-${questionIndex}`;
                    const isOpen = openItems[key];
                    return (
                      <div
                        key={key}
                        className="border-b border-nfw-blackberry/10 last:border-b-0"
                      >
                        <button
                          onClick={() => toggle(key)}
                          className="w-full flex items-center justify-between py-4 text-left group"
                        >
                          <span className="font-serif text-base font-medium text-nfw-blackberry group-hover:text-nfw-aubergine transition-colors pr-4">
                            {faq.question}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-nfw-blackberry flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 pb-4" : "max-h-0"}`}
                        >
                          <p className="font-serif text-nfw-blackberry/70 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STILL HAVE QUESTIONS */}
      <div className="bg-nfw-dove py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl text-nfw-aubergine mb-4">
            Still have questions?
          </h2>
          <p className="font-serif text-nfw-blackberry/60 mb-8 text-lg">
            We&apos;re here to help. Reach out and a real person will get back
            to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4 bg-nfw-aubergine text-nfw-dove font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors"
            >
              Contact Us
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center justify-center px-8 py-4 bg-nfw-dove text-nfw-blackberry border border-nfw-blackberry/20 font-ui font-black text-sm tracking-[0.06em] uppercase hover:border-nfw-blackberry transition-colors"
            >
              Join for Free
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
