import Link from "next/link";
import Image from "next/image";
import { HeroContent } from "@/lib/sections/types";
import { getBackgroundClass, getTextColorForBackground, getEyebrowColorForBackground } from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function HeroSection({ content }: Props) {
  const c = content as unknown as HeroContent;
  const headline = (c?.headline as string) || "";
  const italicPhrase = (c?.headline_italic_phrase as string) || "";
  const parts = headline.split(italicPhrase);
  const bgClass = getBackgroundClass(c?.background);
  const textColor = getTextColorForBackground(c?.background);
  const eyebrowColor = getEyebrowColorForBackground(c?.background);

  return (
    <section className={`relative ${bgClass} overflow-hidden`}>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid gap-8 lg:gap-12 items-center py-4 lg:py-8 ${c.image_position === "left" ? "lg:grid-cols-[47%_53%]" : "lg:grid-cols-[53%_47%]"}`}>
          <div className="space-y-8">
            {c.eyebrow && (
              <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor}`}>
                {c.eyebrow}
              </p>
            )}
            <h1 className={`font-serif text-5xl lg:text-6xl xl:text-[63px] leading-[1.05] ${textColor}`}>
              {parts[0]}
              <em className="italic">{italicPhrase}</em>
              {parts[1]}
            </h1>
            <p className={`font-serif text-xl lg:text-3xl ${c.subheadline_italic !== false ? "italic" : ""} ${textColor} leading-relaxed`}>
              {c?.subheadline || ""}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href={c.cta_primary_url}
                className="inline-flex items-center justify-center px-8 py-4 bg-nfw-citrine text-nfw-blackberry font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
              >
                {c.cta_primary_label}
              </Link>
              <Link
                href={c.cta_secondary_url}
                className="inline-flex items-center justify-center px-8 py-4 border border-nfw-dove/40 text-nfw-dove font-ui font-black text-sm tracking-[0.06em] uppercase hover:border-nfw-dove/80 transition-colors"
              >
                {c.cta_secondary_label}
              </Link>
            </div>
          </div>

          <div className={`relative w-full aspect-[3/4] lg:aspect-auto lg:h-[750px] ${c.image_position === "left" ? "lg:order-first" : "lg:order-last"}`}>
            {(() => {
              const imageSrc = typeof c.images === "string"
                ? c.images
                : Array.isArray(c.images)
                  ? typeof c.images[0] === "string"
                    ? c.images[0]
                    : (c.images[0] as { url?: string })?.url
                  : (c.images as { url?: string })?.url;
              if (!imageSrc) {
                return <div className="w-full h-full bg-nfw-blackberry/30" />;
              }
              return (
                <Image
                  src={imageSrc}
                  alt=""
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 47vw"
                  priority
                />
              );
            })()}
          </div>
        </div>
      </div>
    </section>
  );
}
