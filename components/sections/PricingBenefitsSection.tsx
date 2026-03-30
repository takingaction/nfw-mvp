import Link from "next/link";
import { Check } from "lucide-react";
import { PricingBenefitsContent, IconColor } from "@/lib/sections/types";
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

const ICON_COLORS: Record<IconColor, string> = {
  green: "#d4f1ad",
  yellow: "#fdf493",
  blue: "#b2d1ee",
  lilac: "#c4b7eb",
};

export default function PricingBenefitsSection({ content }: Props) {
  const c = content as unknown as PricingBenefitsContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const mutedTextColor = getMutedTextColorForBackground(c.background);
  const cardTextColor = getCardTextColorForBackground(c.background);
  const ctaClass = getPrimaryButtonClass(c.background);

  return (
    <section className={`py-16 lg:py-24 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            {c.eyebrow && (
              <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-3`}>
                {c.eyebrow}
              </p>
            )}
            <h2 className={`font-serif text-4xl lg:text-6xl ${textColor} mb-4 leading-tight`}>
              {c.headline}
            </h2>
            <p className={`font-sans text-lg ${mutedTextColor} mb-6`}>
              {c.body}
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
                className="flex items-start gap-4 p-6 border border-nfw-blackberry/10"
                style={{ backgroundColor: `${ICON_COLORS[item.icon_color]}20` }}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: ICON_COLORS[item.icon_color] }}
                >
                  <Check className="w-5 h-5 text-nfw-blackberry" />
                </div>
                <div>
                  <p className={`font-ui text-sm font-black tracking-[0.03em] uppercase ${cardTextColor} mb-1`}>
                    {item.title}
                  </p>
                  <p className={`font-sans text-sm ${mutedTextColor}`}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
