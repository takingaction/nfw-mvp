import Link from "next/link";
import { MembershipCtaContent } from "@/lib/sections/types";
import { getBackgroundClass, getTextColorForBackground, getEyebrowColorForBackground } from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function MembershipCtaSection({ content }: Props) {
  const c = content as unknown as MembershipCtaContent;
  const parts = (c.headline || "").split(c.headline_italic_phrase || "");
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);

  return (
    <section className={`${bgClass} py-20 lg:py-28`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left — copy */}
          <div className="space-y-7">
            {c.eyebrow && (
              <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor}`}>
                {c.eyebrow}
              </p>
            )}
            <h2 className={`font-serif text-4xl lg:text-6xl ${textColor} leading-[1.1]`}>
              {parts[0]}
              <em className="italic">{c.headline_italic_phrase}</em>
              {parts[1]}
            </h2>
            <p className={`font-serif text-2xl ${textColor} max-w-full`}>
              {c.body}
            </p>
          </div>

          {/* Right — pricing card */}
          <div className="bg-nfw-aubergine p-10 lg:p-12">
            <div className="mb-8">
              <span className="font-serif text-6xl text-nfw-dove">
                {c.price}
              </span>
              <span className="font-ui text-sm text-nfw-dove/60 ml-2 uppercase tracking-widest">
                {c.price_period}
              </span>
            </div>

            {c.benefits?.length > 0 && (
              <ul className="space-y-1 mb-10 list-disc list-outside ml-6">
                {c.benefits.map(
                  (
                    benefit: any,
                    i,
                  ) => (
                    <li
                      key={i}
                      className="font-serif text-base text-white leading-snug pl-1"
                    >
                      {typeof benefit === "string" ? benefit : benefit.text}
                    </li>
                  ),
                )}
              </ul>
            )}

            <Link
              href={c.cta_url}
              className="block w-full text-center px-8 py-4 bg-nfw-citrine text-nfw-blackberry font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
            >
              {c.cta_label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
