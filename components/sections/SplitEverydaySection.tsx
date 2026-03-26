import Link from "next/link";
import { SplitEverydayContent } from "@/lib/sections/types";
import { getBackgroundClass, getTextColorForBackground, getEyebrowColorForBackground } from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function SplitEverydaySection({ content }: Props) {
  const c = content as unknown as SplitEverydayContent;
  const parts = c.headline.split(c.headline_italic_phrase);
  const imageLeft = c.image_side === "left";
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);

  return (
    <section className={`${bgClass} py-20 lg:py-28`}>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-12">
        <div
          className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${imageLeft ? "" : "lg:[&>*:first-child]:order-last"}`}
        >
          {/* Image */}
          <div className="overflow-hidden">
            {c.image_url && c.image_url.length > 0 ? (
              <img
                src={c.image_url}
                alt=""
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-nfw-powder/30" />
            )}
          </div>

          {/* Copy */}
          <div className="space-y-7">
            {c.eyebrow && (
              <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor}`}>
                {c.eyebrow}
              </p>
            )}
            <h2 className={`font-serif text-4xl lg:text-7xl ${textColor} leading-[1.1]`}>
              {parts[0]}
              <em className="italic">{c.headline_italic_phrase}</em>
              {parts[1]}
            </h2>
            <p className={`font-serif text-2xl ${textColor}`}>{c.body}</p>
            {c.cta_label && (
              <Link
                href={c.cta_url}
                className="inline-flex items-center justify-center px-8 py-4 bg-nfw-citrine text-nfw-blackberry font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
              >
                {c.cta_label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
