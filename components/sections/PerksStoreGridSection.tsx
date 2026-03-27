import Link from "next/link";
import { PerksStoreGridContent, CardSwatchColor } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getMutedTextColorForBackground,
  getCardSwatchColor,
  getCardTextColorForBackground,
  getCardBorderColorForBackground,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function PerksStoreGridSection({ content }: Props) {
  const c = content as unknown as PerksStoreGridContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const mutedTextColor = getMutedTextColorForBackground(c.background);
  const cardTextColor = getCardTextColorForBackground(c.background);
  const cardBorderColor = getCardBorderColorForBackground(c.background);
  const cardBgClass = c.background === "dove" ? "bg-white" : "bg-white/10";
  const ctaLinkColor = c.background === "dove" ? "text-nfw-aubergine hover:text-nfw-blackberry" : "text-nfw-dove hover:text-white";

  return (
    <div className={`py-16 lg:py-24 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className={`font-serif text-4xl lg:text-6xl ${textColor} mb-2`}>
              {c.headline}
            </h2>
            <p className={mutedTextColor}>
              {c.subheadline}
            </p>
          </div>
          <Link
            href={c.cta_url}
            className={`hidden sm:flex items-center gap-1 font-semibold text-sm ${ctaLinkColor} transition-colors whitespace-nowrap ml-8`}
          >
            {c.cta_label}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {c.cards?.map((item, i) => (
            <div
              key={i}
              className={`group border ${cardBorderColor} p-5 ${cardBgClass}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span
                    className="inline-block text-xs px-2.5 py-1 mb-2 font-semibold"
                    style={{
                      backgroundColor: `${getCardSwatchColor(item.color as CardSwatchColor)}40`,
                      color: "#2d1239",
                    }}
                  >
                    {item.category}
                  </span>
                  <h3 className={`font-black text-base font-serif ${cardTextColor}`}>
                    {item.name}
                  </h3>
                </div>
                <div
                  className="w-10 h-10 flex-shrink-0 ml-3 flex items-center justify-center"
                  style={{ backgroundColor: `${getCardSwatchColor(item.color as CardSwatchColor)}50` }}
                >
                  <span className="text-lg font-bold text-nfw-blackberry">
                    {item.name.charAt(0)}
                  </span>
                </div>
              </div>
              <p className={`text-sm ${mutedTextColor} mb-3`}>{item.description}</p>
              <Link
                href={c.cta_url}
                className={`text-xs font-semibold ${ctaLinkColor} transition-colors`}
              >
                {c.cta_label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
