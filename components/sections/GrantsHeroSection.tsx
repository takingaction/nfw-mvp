import Link from "next/link";
import Image from "next/image";
import { GrantsHeroContent } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getEyebrowColorForBackground,
  getMutedTextColorForBackground,
  getPrimaryButtonClass,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function GrantsHeroSection({ content }: Props) {
  const c = content as unknown as GrantsHeroContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const mutedTextColor = getMutedTextColorForBackground(c.background);
  const ctaClass = getPrimaryButtonClass(c.background);
  const secondaryCtaClass = c.background === "dove"
    ? "inline-flex items-center justify-center px-8 py-4 bg-white text-nfw-blackberry border-2 border-nfw-blackberry/20 font-ui font-black text-sm tracking-[0.06em] uppercase hover:border-nfw-blackberry transition-colors"
    : "inline-flex items-center justify-center px-8 py-4 bg-white/10 text-white border-2 border-white/20 font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-white/20 transition-colors";
  const statBgClass = c.background === "dove" ? "bg-white/95" : "bg-white/20";
  const statTextClass = c.background === "dove" ? "text-nfw-blackberry" : "text-white";

  return (
    <div className={bgClass}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            {c.eyebrow && (
              <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-6`}>
                {c.eyebrow}
              </p>
            )}
            <h1 className={`font-serif text-5xl lg:text-6xl xl:text-[63px] ${textColor} leading-[1.05]`}>
              {c.headline}
            </h1>
            <p className={`font-serif text-2xl ${mutedTextColor} max-w-lg leading-relaxed`}>
              {c.subheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href={c.cta_url}
                className={`${ctaClass} hover:opacity-90 transition-opacity`}
              >
                {c.cta_label}
              </Link>
              <Link
                href={c.secondary_cta_url}
                className={secondaryCtaClass}
              >
                {c.secondary_cta_label}
              </Link>
            </div>
            {c.trust_badges && c.trust_badges.length > 0 && (
              <div className="flex flex-wrap gap-6 pt-2 text-sm font-medium" style={{ color: mutedTextColor.includes('white') ? 'rgba(255,255,255,0.7)' : undefined }}>
                {c.trust_badges.map((badge, i) => (
                  <span key={i}>{badge}</span>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={c.image_url}
                alt="Women receiving microgrant support"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-nfw-blackberry/60 via-transparent to-transparent"></div>
              <div className={`absolute bottom-5 left-5 ${statBgClass} px-5 py-4`}>
                <p className={`font-ui text-2xl font-black tracking-[0.03em] uppercase ${statTextClass}`}>
                  {c.stat_value}
                </p>
                <p className={`font-serif text-xs ${c.background === "dove" ? "text-nfw-blackberry/60" : "text-white/60"}`}>
                  {c.stat_label}
                </p>
              </div>
              <div className="absolute top-5 right-5 bg-[#F8F2E2] px-4 py-3">
                <p className="font-ui text-xs font-black text-nfw-blackberry tracking-[0.03em] uppercase">
                  {c.secondary_stat_value}
                </p>
                <p className="font-serif text-xs text-nfw-blackberry/70">{c.secondary_stat_label}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
