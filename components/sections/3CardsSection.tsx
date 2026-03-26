import Link from "next/link";
import { ThreeCardsContent } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getEyebrowColorForBackground,
  getCardSwatchColor,
  getCardTextColorForBackground,
  getCardBorderColorForBackground,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function ThreeCardsSection({ content }: Props) {
  const c = content as unknown as ThreeCardsContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const cardTextColor = getCardTextColorForBackground(c.background);
  const cardBorderColor = getCardBorderColorForBackground(c.background);
  const cardLinkColor = c.background === "dove" ? "text-nfw-aubergine" : "text-nfw-dove";

  return (
    <div className={`py-20 lg:py-28 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          {c.eyebrow && (
            <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-3`}>
              {c.eyebrow}
            </p>
          )}
          <h2 className={`font-serif text-4xl lg:text-6xl ${textColor} mb-4 leading-tight`}>
            {c.headline}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {c.cards?.map((card, i) => (
            <div
              key={i}
              className={`border ${cardBorderColor} p-8`}
            >
              <div
                className="w-14 h-14 mb-6"
                style={{ backgroundColor: `${getCardSwatchColor(card.color)}50` }}
              />
              <h3 className={`font-ui text-sm font-black tracking-[0.06em] uppercase ${cardTextColor} mb-3`}>
                {card.title}
              </h3>
              <p className={`font-sans ${cardTextColor} opacity-60 mb-6 leading-relaxed`}>
                {card.description}
              </p>
              <Link
                href={card.link}
                className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${cardLinkColor} hover:underline`}
              >
                {card.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
