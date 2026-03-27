import Link from "next/link";
import { PricingCtaBoxContent } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getMutedTextColorForBackground,
  getPrimaryButtonClass,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function PricingCtaBoxSection({ content }: Props) {
  const c = content as unknown as PricingCtaBoxContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const mutedTextColor = getMutedTextColorForBackground(c.background);
  const ctaClass = getPrimaryButtonClass(c.background);
  const innerCardBorder = c.background === "dove" ? "border-nfw-blackberry/10" : "border-white/20";

  return (
    <section className={`py-16 lg:py-24 ${bgClass}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center p-10 border ${innerCardBorder} ${c.background === "dove" ? "bg-white" : "bg-white/10"}`}>
          <h3 className={`font-serif text-2xl ${textColor} mb-3`}>
            {c.headline}
          </h3>
          <p className={`font-sans ${mutedTextColor} mb-6 max-w-md mx-auto`}>
            {c.body}
          </p>
          <Link
            href={c.cta_url}
            className={`inline-flex items-center justify-center px-10 py-4 ${ctaClass} font-ui font-black text-sm tracking-[0.06em] uppercase hover:opacity-90 transition-opacity`}
          >
            {c.cta_label}
          </Link>
          <p className={`font-sans text-sm ${mutedTextColor} mt-4`}>
            {c.secondary_text}{" "}
            <Link
              href={c.secondary_url}
              className={`underline hover:${textColor} transition-colors`}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
