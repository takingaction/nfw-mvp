"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { PricingCardsContent, CheckboxColor } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getEyebrowColorForBackground,
  getCardTextColorForBackground,
  getCardBorderColorForBackground,
  getPrimaryButtonClass,
  getMutedTextColorForBackground,
} from "@/lib/colors";
import PlanButton from "./PlanButton";

interface Props {
  content: Record<string, unknown>;
}

const CHECKED_COLORS: Record<CheckboxColor, string> = {
  green: "#d4f1ad",
  aubergine: "#3e155f",
  wisteria: "#7786be",
  lilac: "#c4b7eb",
  citrine: "#e8d5a3",
};

const DARK_CHECKED_COLORS: CheckboxColor[] = ["aubergine", "wisteria"];

export default function PricingCardsSection({ content }: Props) {
  const c = content as unknown as PricingCardsContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const mutedTextColor = getMutedTextColorForBackground(c.background);
  const cardTextColor = getCardTextColorForBackground(c.background);
  const cardBorderColor = getCardBorderColorForBackground(c.background);
  const cardBgClass = c.background === "dove" ? "bg-white" : "bg-white/10";
  const checkedBg = CHECKED_COLORS[c.checkbox_checked] || CHECKED_COLORS.green;
  const isDarkChecked = DARK_CHECKED_COLORS.includes(c.checkbox_checked);
  const checkIconColor = isDarkChecked ? "#ffffff" : "#1a1a1a";
  const cardSubtextColor = c.background === "dove" ? "text-nfw-blackberry/60" : "text-white/60";
  const cardHighlightedBg = c.background === "dove" ? "bg-nfw-aubergine" : "bg-nfw-aubergine/80";
  const ctaClass = getPrimaryButtonClass(c.background);
  const innerCardBorder = c.background === "dove" ? "border-nfw-blackberry/10" : "border-white/20";

  return (
    <section className={`py-16 lg:py-24 ${bgClass}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          {c.eyebrow && (
            <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-3`}>
              {c.eyebrow}
            </p>
          )}
          <h2 className={`font-serif text-4xl lg:text-6xl ${textColor} mb-3`}>
            {c.headline}
          </h2>
          {c.subheadline && (
            <p className="font-serif text-lg text-nfw-blackberry/60">
              {c.subheadline}
            </p>
          )}
        </div>

        <div className={`grid gap-6 mb-12 ${(c.show_free_plan ? c.cards : c.cards?.filter(p => p.id !== "free"))?.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
          {(c.show_free_plan ? c.cards : c.cards?.filter(p => p.id !== "free"))?.map((plan) => (
            <div
              key={plan.id}
              className={`p-8 border ${cardBorderColor} ${plan.highlighted ? cardHighlightedBg : cardBgClass}`}
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
                  plan.highlighted ? "text-nfw-dove" : cardTextColor
                }`}
              >
                {plan.name}
              </h3>

              <div className="mb-3">
                <span
                  className={`text-4xl font-black ${
                    plan.highlighted ? "text-nfw-citrine" : cardTextColor
                  }`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-sm ml-1 ${
                    plan.highlighted ? "text-nfw-lilac" : cardSubtextColor
                  }`}
                >
                  {plan.period}
                </span>
              </div>

              <p
                className={`font-serif text-sm mb-6 ${
                  plan.highlighted ? "text-nfw-lilac" : cardSubtextColor
                }`}
              >
                {plan.description}
              </p>

              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5" style={{ backgroundColor: checkedBg }}>
                      <Check className="w-3 h-3" style={{ color: checkIconColor }} />
                    </div>
                    <span
                      className={`font-serif text-sm ${
                        plan.highlighted ? "text-nfw-dove" : cardSubtextColor
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {c.show_buttons !== false && (
                <div className="mt-6 pt-6 border-t border-nfw-blackberry/10">
                  <PlanButton plan={plan} />
                </div>
              )}
            </div>
          ))}
        </div>

        {c.show_cta !== false && (
          <div className={`text-center p-10 border ${innerCardBorder} ${c.background === "dove" ? "bg-white" : "bg-white/10"}`}>
            <h3 className={`font-serif text-2xl ${textColor} mb-3`}>
              {c.cta_headline || "Ready to join?"}
            </h3>
            <p className={`font-serif ${mutedTextColor} mb-6 max-w-md mx-auto`}>
              {c.cta_body || "Create your free account to get started."}
            </p>
            <Link
              href={c.cta_url || "/auth/sign-up"}
              className={`inline-flex items-center justify-center px-10 py-4 ${ctaClass} font-ui font-black text-sm tracking-[0.06em] uppercase hover:opacity-90 transition-opacity`}
            >
              {c.cta_label || "Join Now"}
            </Link>
            {c.cta_secondary_prefix && (
              <p className={`font-serif text-sm ${mutedTextColor} mt-4`}>
                {c.cta_secondary_prefix}
              </p>
            )}
            <p className={`font-serif text-sm ${mutedTextColor} mt-0.5`}>
              {c.cta_secondary_text || "Already a member?"}{" "}
              <Link
                href={c.cta_secondary_url || "/auth/login"}
                className={`underline hover:${textColor} transition-colors`}
              >
                {c.cta_secondary_link_label || "Sign in"}
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
