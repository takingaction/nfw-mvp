import Link from "next/link";
import { GrantAmountCardsContent, BgTint } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getEyebrowColorForBackground,
  getMutedTextColorForBackground,
  getCardTextColorForBackground,
  getPrimaryButtonClass,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

const BG_TINT_CLASSES: Record<BgTint, string> = {
  powder: "bg-nfw-powder/20",
  citrine: "bg-nfw-citrine/20",
  lilac: "bg-nfw-lilac/20",
};

export default function GrantAmountCardsSection({ content }: Props) {
  const c = content as unknown as GrantAmountCardsContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const mutedTextColor = getMutedTextColorForBackground(c.background);
  const cardTextColor = getCardTextColorForBackground(c.background);
  const ctaClass = getPrimaryButtonClass(c.background);

  return (
    <div className={`py-20 lg:py-28 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-3`}>
              {c.eyebrow}
            </p>
            <h2 className={`font-serif text-4xl lg:text-6xl ${textColor} mb-4 leading-tight`}>
              {c.headline}
            </h2>
            <p className={`font-serif text-2xl ${mutedTextColor} mb-8`}>
              {c.subheadline}
            </p>
            <Link
              href={c.cta_url}
              className={`inline-flex items-center justify-center px-8 py-4 ${ctaClass} font-ui font-black text-sm tracking-[0.06em] uppercase hover:opacity-90 transition-opacity`}
            >
              {c.cta_label}
            </Link>
          </div>
          <div className="space-y-4">
            {c.items?.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 p-6 border border-nfw-blackberry/10 ${BG_TINT_CLASSES[item.bg_tint]}`}
              >
                <div>
                  <p className={`font-ui text-lg font-black tracking-[0.03em] uppercase ${cardTextColor}`}>
                    {item.range}{" "}
                    <span className="font-sans font-medium text-base">
                      {item.label}
                    </span>
                  </p>
                  <p className={`font-sans text-sm ${mutedTextColor} mt-1`}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
