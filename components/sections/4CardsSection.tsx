import { FourCardsContent } from "@/lib/sections/types";
import { getBackgroundClass, getTextColorForBackground, getEyebrowColorForBackground, getCardSwatchColor, getCardTextColorForBackground, getCardBorderColorForBackground } from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function FourCardsSection({ content }: Props) {
  const c = content as unknown as FourCardsContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const cardTextColor = getCardTextColorForBackground(c.background);
  const cardBorderColor = getCardBorderColorForBackground(c.background);

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
          {c.subheadline && (
            <p className={`font-sans text-lg ${textColor} opacity-70`}>
              {c.subheadline}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {c.cards?.map((card, i) => (
            <div
              key={i}
              className={`border ${cardBorderColor} p-6`}
            >
              <div
                className="w-12 h-12 mb-4"
                style={{ backgroundColor: `${getCardSwatchColor(card.color)}50` }}
              />
              <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${cardTextColor} opacity-40 mb-1`}>
                {card.age}
              </p>
              <h3 className={`font-ui text-sm font-black tracking-[0.03em] uppercase ${cardTextColor} mb-2`}>
                {card.title}
              </h3>
              <p className={`font-sans text-sm ${cardTextColor} opacity-60`}>{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
