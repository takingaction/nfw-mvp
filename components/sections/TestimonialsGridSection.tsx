"use client";

import { TestimonialsGridContent, BackgroundColor, CardSwatchColor } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getEyebrowColorForBackground,
  getMutedTextColorForBackground,
  getCardTextColorForBackground,
  getCardBorderColorForBackground,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

const AVATAR_COLOR_MAP: Record<CardSwatchColor, string> = {
  yellow: "bg-yellow-100",
  green: "bg-green-100",
  blue: "bg-blue-100",
  lavender: "bg-purple-100",
  citrine: "bg-nfw-citrine/40",
  lilac: "bg-nfw-lilac/40",
  powder: "bg-nfw-powder/40",
  dark_purple: "bg-purple-900",
  medium_lavender: "bg-purple-300",
  soft_blue: "bg-blue-300",
};

export default function TestimonialsGridSection({ content }: Props) {
  const c = content as unknown as TestimonialsGridContent;
  const bg = (c.background ?? "dove") as BackgroundColor;
  const cards = c.cards ?? [];

  const textColor = getTextColorForBackground(bg);
  const eyebrowColor = getEyebrowColorForBackground(bg);
  const mutedColor = getMutedTextColorForBackground(bg);
  const cardTextColor = getCardTextColorForBackground(bg);
  const cardBorderColor = getCardBorderColorForBackground(bg);

  if (cards.length === 0) return null;

  return (
    <section className={`${getBackgroundClass(bg)} py-16 lg:py-24 overflow-hidden`}>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          {c.eyebrow && (
            <p className={`text-xs font-semibold uppercase tracking-widest mb-3 font-ui ${eyebrowColor}`}>
              {c.eyebrow}
            </p>
          )}
          {c.headline && (
            <h2 className={`font-serif text-4xl lg:text-6xl mb-4 leading-tight ${textColor}`}>
              {c.headline}
            </h2>
          )}
          {c.subheadline && (
            <p className={`text-lg ${mutedColor}`}>
              {c.subheadline}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <div
              key={card.name || index}
              className={`bg-white border ${cardBorderColor} p-6`}
            >
              <p className={`${cardTextColor}/70 text-sm leading-relaxed mb-6`}>
                &ldquo;{card.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${AVATAR_COLOR_MAP[card.avatar_color] || AVATAR_COLOR_MAP.lilac} flex items-center justify-center text-sm font-black text-nfw-blackberry`}>
                  {card.name.charAt(0)}
                </div>
                <div>
                  <p className={`font-bold ${cardTextColor} text-sm`}>{card.name}</p>
                  <p className={`text-xs ${cardTextColor}/50`}>{card.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
