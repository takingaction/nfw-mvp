import Link from "next/link";
import Image from "next/image";
import { HeroVideoContent } from "@/lib/sections/types";
import { getBackgroundClass, getTextColorForBackground, getEyebrowColorForBackground } from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function HeroVideoSection({ content }: Props) {
  const c = content as unknown as HeroVideoContent;
  const headline = (c?.headline as string) || "";
  const italicPhrase = (c?.headline_italic_phrase as string) || "";
  const parts = headline.split(italicPhrase);
  const bgClass = getBackgroundClass(c?.background);
  const textColor = getTextColorForBackground(c?.background);
  const eyebrowColor = getEyebrowColorForBackground(c?.background);

  const isContain = c.object_fit === "contain";

  return (
    <section className={`relative ${bgClass} overflow-hidden`}>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 lg:pl-12">
        <div className={`grid lg:grid-cols-[53%_47%] gap-8 lg:gap-8 items-center ${isContain ? "py-12 lg:py-24" : "py-4 lg:py-8"}`}>
          <div className="space-y-8">
            {c.eyebrow && (
              <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor}`}>
                {c.eyebrow}
              </p>
            )}
            <h1 className={`font-serif text-5xl lg:text-6xl xl:text-[63px] leading-[1.05] ${textColor}`}>
              {parts[0]}
              <em className="italic">{c.headline_italic_phrase}</em>
              {parts[1]}
            </h1>
            <p className={`font-serif italic text-xl lg:text-3xl ${textColor} leading-relaxed`}>
              {c.subheadline || ""}
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

          <div className={isContain ? "relative w-full aspect-[16/9] lg:max-h-[750px]" : "relative w-full lg:h-[750px] lg:max-h-[750px]"}>
            {c.video_url && c.video_url.length > 0 ? (
              <video
                src={c.video_url}
                autoPlay={c.autoplay !== false}
                muted={c.autoplay && c.muted === false ? true : (c.muted !== false)}
                loop={c.loop !== false}
                playsInline={c.plays_inline !== false}
                controls={c.show_controls}
                poster={c.poster_image_url && c.poster_image_url.length > 0 ? c.poster_image_url : undefined}
                className={isContain ? "w-full h-full object-contain" : "w-full h-full object-cover"}
              />
            ) : c.poster_image_url && c.poster_image_url.length > 0 ? (
              <Image
                src={c.poster_image_url}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 47vw"
              />
            ) : (
              <div className="w-full h-full bg-nfw-blackberry/30 flex items-center justify-center">
                <p className="text-nfw-dove/50 text-sm">No video uploaded</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
