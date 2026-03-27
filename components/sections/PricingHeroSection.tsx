import { PricingHeroContent } from "@/lib/sections/types";
import { getBackgroundClass, getTextColorForBackground, getEyebrowColorForBackground } from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function PricingHeroSection({ content }: Props) {
  const c = content as unknown as PricingHeroContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);

  return (
    <section className={`${bgClass} py-20 lg:py-24`}>
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
          <div className="flex flex-wrap justify-center gap-6 font-sans text-sm text-opacity-70">
            {c.trust_badges.map((badge, i) => (
              <span key={i} className={textColor}>{badge}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
