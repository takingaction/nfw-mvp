import Link from "next/link";
import { Check } from "lucide-react";
import { PricingFinalCtaContent, IconColor } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getMutedTextColorForBackground,
  getPrimaryButtonClass,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

const ICON_COLORS: Record<IconColor, string> = {
  green: "#d4f1ad",
  yellow: "#e8d5a3",
  blue: "#b2d1ee",
  lilac: "#c4b7eb",
};

export default function PricingFinalCtaSection({ content }: Props) {
  const c = content as unknown as PricingFinalCtaContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const mutedTextColor = getMutedTextColorForBackground(c.background);
  const ctaClass = getPrimaryButtonClass(c.background);

  return (
    <section className={`py-20 lg:py-32 ${bgClass} relative overflow-hidden`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <h2 className={`font-serif text-4xl lg:text-6xl ${textColor} mb-6`}>
          {c.headline}
        </h2>
        <p className={`font-serif text-xl ${mutedTextColor} mb-8 max-w-2xl mx-auto`}>
          {c.subheadline}
        </p>
        <div className="grid sm:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
          {c.items?.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 text-left"
            >
              <div
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center mt-1"
                style={{ backgroundColor: ICON_COLORS[item.icon_color] }}
              >
                <Check className="w-4 h-4 text-nfw-blackberry" />
              </div>
              <div>
                <div className={`font-ui text-sm font-black tracking-[0.03em] uppercase ${textColor} mb-1`}>{item.title}</div>
                <div className={`font-sans text-sm ${mutedTextColor}`}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <Link
          href={c.cta_url}
          className={`inline-flex items-center justify-center px-10 py-5 ${ctaClass} font-ui font-black text-sm tracking-[0.06em] uppercase hover:opacity-90 transition-opacity`}
        >
          {c.cta_label}
        </Link>
        {c.footnote && (
          <p className={`font-sans text-sm ${mutedTextColor} mt-6`}>
            {c.footnote}
          </p>
        )}
      </div>
    </section>
  );
}
