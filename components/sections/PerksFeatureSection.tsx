import Link from "next/link";
import { PerksFeatureContent } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getEyebrowColorForBackground,
  getPrimaryButtonClass,
  getLogoFilterClass,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function PerksFeatureSection({ content }: Props) {
  const c = content as unknown as PerksFeatureContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const ctaClass = getPrimaryButtonClass(c.background);
  const logoFilterClass = getLogoFilterClass(c.background);

  const parts = c.headline.split(c.headline_italic_phrase);
  const logos = c.logos ?? [];
  const scrollLogos = [...logos, ...logos];

  return (
    <section className={`py-20 lg:py-28 ${bgClass}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="items-center">
          <div className="space-y-7 flex flex-col items-center">
            {c.eyebrow && (
              <p className={`font-ui text-xs font-black tracking-[0.06em] text-center uppercase ${eyebrowColor}`}>
                {c.eyebrow}
              </p>
            )}
            <h2 className={`font-serif text-4xl lg:text-6xl text-center ${textColor} !leading-[1.1]`}>
              {parts[0]}
              <em className="italic">{c.headline_italic_phrase}</em>
              {parts[1]}
            </h2>
            <p className={`font-serif text-2xl text-center ${textColor} opacity-80`}>
              {c.body}
            </p>
            {c.cta_label && (
              <Link
                href={c.cta_url}
                className={`inline-flex items-center justify-center px-8 py-4 ${ctaClass} font-ui font-black text-sm tracking-[0.06em] uppercase hover:opacity-90 transition-opacity`}
              >
                {c.cta_label}
              </Link>
            )}
          </div>
          <div />
        </div>
      </div>

      {logos.length > 0 && (
        <div className="border-t border-white/20 pt-12">
          {c.logo_strip_eyebrow && (
            <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase text-center ${eyebrowColor} mb-8`}>
              {c.logo_strip_eyebrow}
            </p>
          )}
          <div className="overflow-hidden">
            <div
              className="flex gap-16 items-center"
              style={{
                animation: "scroll-logos 20s linear infinite",
                width: "max-content",
                willChange: "transform",
              }}
            >
              {[...logos, ...logos, ...logos].map((logo, i) => (
                <div key={i} className="flex-shrink-0 h-8 flex items-center">
                  <img
                    src={
                      typeof logo.image_url === "string"
                        ? logo.image_url
                        : ((logo.image_url as any)?.url ?? "")
                    }
                    alt={logo.name}
                    className={`h-full w-auto object-contain ${logoFilterClass}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
