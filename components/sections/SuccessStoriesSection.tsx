import Link from "next/link";
import Image from "next/image";
import { SuccessStoriesContent, BgTint } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getEyebrowColorForBackground,
  getMutedTextColorForBackground,
  getCardTextColorForBackground,
  getCardBorderColorForBackground,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

const BG_TINT_CLASSES: Record<BgTint, string> = {
  citrine: "bg-[#F8F2E2]",
  powder: "bg-[#E9EDF2]",
  lilac: "bg-[#EEE9F3]",
};

export default function SuccessStoriesSection({ content }: Props) {
  const c = content as unknown as SuccessStoriesContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const mutedTextColor = getMutedTextColorForBackground(c.background);
  const cardTextColor = getCardTextColorForBackground(c.background);
  const cardBorderColor = getCardBorderColorForBackground(c.background);
  const cardBgClass = c.background === "dove" ? "bg-nfw-dove" : "bg-white/10";
  const ctaLinkColor = c.background === "dove" ? "text-nfw-aubergine hover:text-nfw-blackberry" : "text-nfw-dove hover:text-white";

  return (
    <div className={`py-20 lg:py-28 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-2`}>
              {c.eyebrow}
            </p>
            <h2 className={`font-serif text-4xl lg:text-6xl ${textColor} leading-tight`}>
              {c.headline}
            </h2>
            <p className={`font-serif text-2xl ${mutedTextColor} mt-2`}>
              {c.subheadline}
            </p>
          </div>
          <Link
            href={c.cta_url}
            className={`hidden sm:flex items-center gap-1 font-ui text-sm font-medium ${ctaLinkColor} transition-colors whitespace-nowrap`}
          >
            {c.cta_label}
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {c.cards?.map((story, i) => (
            <div
              key={i}
              className={`border ${cardBorderColor} overflow-hidden ${cardBgClass}`}
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={story.image_url}
                  alt={story.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <span
                  className={`inline-block font-ui text-xs font-black tracking-[0.06em] uppercase px-2.5 py-1 mb-3 text-nfw-blackberry ${BG_TINT_CLASSES[story.bg_tint]}`}
                >
                  {story.category}
                </span>
                <h3 className={`font-ui text-sm font-black tracking-[0.03em] uppercase ${cardTextColor} mb-3 line-clamp-2`}>
                  {story.title}
                </h3>
                <Link
                  href={c.cta_url}
                  className={`font-ui text-sm font-medium ${ctaLinkColor} transition-colors`}
                >
                  Read more
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
