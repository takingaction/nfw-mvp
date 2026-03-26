import Link from "next/link";
import { RightSide3FeaturesContent } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getMutedTextColorForBackground,
  getEyebrowColorForBackground,
  getPrimaryButtonClass,
  getCardSwatchBgClass,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function RightSide3FeaturesSection({ content }: Props) {
  const c = content as unknown as RightSide3FeaturesContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const mutedTextColor = getMutedTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const ctaClass = getPrimaryButtonClass(c.background);

  return (
    <div className={`py-20 lg:py-28 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            {c.eyebrow && (
              <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-3`}>
                {c.eyebrow}
              </p>
            )}
            <h2 className={`font-serif text-4xl lg:text-6xl ${textColor} mb-6 leading-tight`}>
              {c.headline}
            </h2>
            {c.body && (
              <div className="space-y-4 mb-8">
                {c.body.split("\n\n").map((paragraph, i) => (
                  <p key={i} className={`font-serif text-2xl ${mutedTextColor} leading-relaxed`}>
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
            {c.cta_label && c.cta_url && (
              <Link
                href={c.cta_url}
                className={`inline-flex items-center justify-center px-8 py-4 ${ctaClass} font-ui font-black text-sm tracking-[0.06em] uppercase hover:opacity-90 transition-opacity`}
              >
                {c.cta_label}
              </Link>
            )}
          </div>
          <div className="space-y-4">
            {c.items?.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 p-6 border border-nfw-blackberry/10 ${getCardSwatchBgClass(item.bg)}`}
              >
                <div>
                  <p className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-1">
                    {item.title}
                  </p>
                  <p className="font-sans text-sm text-nfw-blackberry/60">
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
