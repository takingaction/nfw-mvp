"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

interface FaqQuestion {
  question: string;
  answer: string;
}

interface FaqSection {
  category: string;
  questions: FaqQuestion[];
}

interface FaqButton {
  label: string;
  url: string;
  style: "solid" | "ghost";
  open_in_new_tab: boolean;
}

interface FaqData {
  id: string;
  hero_eyebrow: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_background: string;
  faq_sections: FaqSection[];
  still_have_questions_heading: string;
  still_have_questions_subheading: string;
  still_have_questions_buttons: FaqButton[];
}

const defaultData: FaqData = {
  id: "",
  hero_eyebrow: "We've got answers",
  hero_headline: "Questions? We've got answers.",
  hero_subheadline: "Everything you need to know about NFW membership, microgrants, perks, and more.",
  hero_background: "aubergine",
  faq_sections: [],
  still_have_questions_heading: "Still have questions?",
  still_have_questions_subheading: "We're here to help. Reach out and a real person will get back to you.",
  still_have_questions_buttons: [
    { label: "Contact Us", url: "/contact", style: "solid", open_in_new_tab: false },
    { label: "Join for Free", url: "/auth/sign-up", style: "ghost", open_in_new_tab: false },
  ],
};

function parseMarkdownLinks(text: string, linkClass: string): string {
  return text.replace(
    /\[([^\]]+)\]\(([^)]+)\)(?:\|(\w+))?/g,
    (match, linkText, url, target) => {
      const attrs = target === "_blank"
        ? ` target="_blank" rel="noopener noreferrer"`
        : "";
      return `<a href="${url}" class="${linkClass}"${attrs}>${linkText}</a>`;
    }
  );
}

function getBackgroundClass(bg: string): string {
  switch (bg) {
    case "dove": return "bg-nfw-dove";
    case "aubergine": return "bg-nfw-aubergine";
    case "wisteria": return "bg-nfw-wisteria";
    case "lilac": return "bg-nfw-lilac";
    case "blackberry": return "bg-nfw-blackberry";
    default: return "bg-nfw-aubergine";
  }
}

function getTextColorForBackground(bg: string): string {
  switch (bg) {
    case "dove": return "text-nfw-blackberry";
    case "aubergine": return "text-nfw-dove";
    case "wisteria": return "text-nfw-dove";
    case "lilac": return "text-nfw-blackberry";
    case "blackberry": return "text-nfw-dove";
    default: return "text-nfw-dove";
  }
}

function getEyebrowColorForBackground(bg: string): string {
  switch (bg) {
    case "dove": return "text-nfw-aubergine/60";
    case "aubergine": return "text-nfw-dove/70";
    case "wisteria": return "text-nfw-dove/70";
    case "lilac": return "text-nfw-blackberry/50";
    case "blackberry": return "text-nfw-citrine";
    default: return "text-nfw-dove/70";
  }
}

export default function FaqClient({ faqData }: { faqData: FaqData | null }) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const data = faqData || defaultData;
  const bgClass = getBackgroundClass(data.hero_background);
  const textColor = getTextColorForBackground(data.hero_background);
  const eyebrowColor = getEyebrowColorForBackground(data.hero_background);
  const heroLinkColor = data.hero_background === "dove" ? "text-nfw-aubergine underline hover:text-nfw-lilac" : "text-nfw-citrine underline hover:text-nfw-lilac";
  const accordionLinkColor = "text-nfw-aubergine underline hover:text-nfw-lilac";

  const toggle = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderButtons = () => {
    const buttons = data.still_have_questions_buttons;
    if (!buttons || buttons.length === 0) return null;

    const count = buttons.length;
    const isOdd = count % 2 !== 0;

    if (count === 1) {
      const btn = buttons[0];
      return (
        <div className="flex justify-center">
          <Link
            href={btn.url}
            target={btn.open_in_new_tab ? "_blank" : "_self"}
            rel={btn.open_in_new_tab ? "noopener noreferrer" : undefined}
            className={btn.style === "solid"
              ? "inline-flex items-center justify-center px-8 py-4 bg-nfw-aubergine text-nfw-dove font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors"
              : "inline-flex items-center justify-center px-8 py-4 bg-nfw-dove text-nfw-blackberry border border-nfw-blackberry/20 font-ui font-black text-sm tracking-[0.06em] uppercase hover:border-nfw-blackberry transition-colors"
            }
          >
            {btn.label}
          </Link>
        </div>
      );
    }

    if (isOdd && count === 3) {
      const firstRow = buttons.slice(0, 2);
      const secondRow = buttons[2];
      return (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center sm:items-start">
            {firstRow.map((btn, i) => (
              <Link
                key={i}
                href={btn.url}
                target={btn.open_in_new_tab ? "_blank" : "_self"}
                rel={btn.open_in_new_tab ? "noopener noreferrer" : undefined}
                className={btn.style === "solid"
                  ? "inline-flex items-center justify-center px-8 py-4 bg-nfw-aubergine text-nfw-dove font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors"
                  : "inline-flex items-center justify-center px-8 py-4 bg-nfw-dove text-nfw-blackberry border border-nfw-blackberry/20 font-ui font-black text-sm tracking-[0.06em] uppercase hover:border-nfw-blackberry transition-colors"
                }
              >
                {btn.label}
              </Link>
            ))}
          </div>
          <div className="flex justify-center">
            <Link
              href={secondRow.url}
              target={secondRow.open_in_new_tab ? "_blank" : "_self"}
              rel={secondRow.open_in_new_tab ? "noopener noreferrer" : undefined}
              className={secondRow.style === "solid"
                ? "inline-flex items-center justify-center px-8 py-4 bg-nfw-aubergine text-nfw-dove font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors"
                : "inline-flex items-center justify-center px-8 py-4 bg-nfw-dove text-nfw-blackberry border border-nfw-blackberry/20 font-ui font-black text-sm tracking-[0.06em] uppercase hover:border-nfw-blackberry transition-colors"
              }
            >
              {secondRow.label}
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {buttons.map((btn, i) => (
          <Link
            key={i}
            href={btn.url}
            target={btn.open_in_new_tab ? "_blank" : "_self"}
            rel={btn.open_in_new_tab ? "noopener noreferrer" : undefined}
            className={btn.style === "solid"
              ? "inline-flex items-center justify-center px-8 py-4 bg-nfw-aubergine text-nfw-dove font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors"
              : "inline-flex items-center justify-center px-8 py-4 bg-nfw-dove text-nfw-blackberry border border-nfw-blackberry/20 font-ui font-black text-sm tracking-[0.06em] uppercase hover:border-nfw-blackberry transition-colors"
            }
          >
            {btn.label}
          </Link>
        ))}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-nfw-dove">
      {/* HERO */}
      <div className={bgClass}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-6`}>
            {data.hero_eyebrow}
          </p>
          <h1 className={`font-serif text-4xl lg:text-6xl ${textColor} mb-6 leading-tight`}>
            {data.hero_headline}
          </h1>
          <p className={`font-serif text-xl ${textColor} max-w-2xl mx-auto`}>
            {data.hero_subheadline}
          </p>
        </div>
      </div>

      {/* FAQ SECTIONS */}
      <div className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {data.faq_sections.map((section, sectionIndex) => (
              <div key={section.category}>
                <h2 className="font-serif text-lg font-black tracking-[0.06em] uppercase text-nfw-aubergine mb-6">
                  {section.category}
                </h2>
                <div className="space-y-0">
                  {section.questions.map((faq, questionIndex) => {
                    const key = `${sectionIndex}-${questionIndex}`;
                    const isOpen = openItems[key];
                    const parsedAnswer = parseMarkdownLinks(faq.answer, accordionLinkColor);
                    return (
                      <div
                        key={key}
                        className="border-b border-nfw-blackberry/10 last:border-b-0"
                      >
                        <button
                          onClick={() => toggle(key)}
                          className="w-full flex items-center justify-between py-4 text-left group"
                        >
                          <span className="font-serif text-xl font-medium text-nfw-blackberry group-hover:text-nfw-aubergine transition-colors pr-4">
                            {faq.question}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-nfw-blackberry flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 pb-4" : "max-h-0"}`}
                        >
                          <p
                            className="font-serif text-lg text-nfw-blackberry/70 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: parsedAnswer }}
                          />
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
            {data.still_have_questions_heading}
          </h2>
          <p className="font-serif text-nfw-blackberry/60 mb-8 text-lg">
            {data.still_have_questions_subheading}
          </p>
          {renderButtons()}
        </div>
      </div>
    </main>
  );
}