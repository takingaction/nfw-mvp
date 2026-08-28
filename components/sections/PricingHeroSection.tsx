import Link from "next/link";
import { PricingHeroContent } from "@/lib/sections/types";
import { getBackgroundClass, getTextColorForBackground, getEyebrowColorForBackground, getPrimaryButtonClass } from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function PricingHeroSection({ content }: Props) {
  const c = content as unknown as PricingHeroContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);

  return (
    <section className={`${bgClass} py-16 lg:py-20`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {c.eyebrow && (
          <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-6`}>
            {c.eyebrow}
          </p>
        )}
        <h1 className={`font-serif text-4xl lg:text-6xl ${textColor} mb-6 leading-tight`}>
          {c.headline}
        </h1>
        <p className={`font-serif text-xl ${textColor} max-w-2xl mx-auto mb-8`}>
          {c.subheadline}
        </p>
        {c.trust_badges && c.trust_badges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6 font-serif text-sm text-opacity-70">
            {c.trust_badges.map((badge, i) => (
              <span key={i} className={textColor}>{badge}</span>
            ))}
          </div>
        )}
        {c.cta_primary_label && (
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {c.cta_primary_label && c.cta_primary_url && (
              <Link href={c.cta_primary_url} className={getPrimaryButtonClass(c.background)}>
                {c.cta_primary_label}
              </Link>
            )}
            {c.cta_secondary_label && c.cta_secondary_url && (
              <Link href={c.cta_secondary_url} className={getPrimaryButtonClass(c.background)}>
                {c.cta_secondary_label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
