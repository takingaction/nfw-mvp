import { Check } from "lucide-react";
import { PricingCardsContent, CheckboxColor } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getEyebrowColorForBackground,
  getCardTextColorForBackground,
  getCardBorderColorForBackground,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

const CHECKED_COLORS: Record<CheckboxColor, string> = {
  green: "#d4f1ad",
  aubergine: "#3e155f",
  wisteria: "#7786be",
  citrine: "#e8d5a3",
};

const DARK_CHECKED_COLORS: CheckboxColor[] = ["aubergine", "wisteria"];

export default function PricingCardsSection({ content }: Props) {
  const c = content as unknown as PricingCardsContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const cardTextColor = getCardTextColorForBackground(c.background);
  const cardBorderColor = getCardBorderColorForBackground(c.background);
  const cardBgClass = c.background === "dove" ? "bg-white" : "bg-white/10";
  const checkedBg = CHECKED_COLORS[c.checkbox_checked] || CHECKED_COLORS.green;
  const isDarkChecked = DARK_CHECKED_COLORS.includes(c.checkbox_checked);
  const checkIconColor = isDarkChecked ? "#ffffff" : "#1a1a1a";
  const cardSubtextColor = c.background === "dove" ? "text-nfw-blackberry/60" : "text-white/60";
  const cardHighlightedBg = c.background === "dove" ? "bg-nfw-aubergine" : "bg-nfw-aubergine/80";

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
            <p className="font-sans text-lg text-nfw-blackberry/60">
              {c.subheadline}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {c.cards?.map((plan) => (
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
                className={`font-sans text-sm mb-6 ${
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
                      className={`font-sans text-sm ${
                        plan.highlighted ? "text-nfw-dove" : cardSubtextColor
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
      </div>
    </section>
  );
}
