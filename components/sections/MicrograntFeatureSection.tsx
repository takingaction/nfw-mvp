import Link from "next/link";
import { MicrograntFeatureContent } from "@/lib/sections/types";

interface Props {
  content: Record<string, unknown>;
}

export default function MicrograntFeatureSection({ content }: Props) {
  const c = content as MicrograntFeatureContent;
  const parts = c.headline.split(c.headline_italic_phrase);

  return (
    <section className="bg-nfw-dove py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — photo */}
          <div className="relative aspect-[4/5] overflow-hidden bg-nfw-stone/20">
            {c.image_url ? (
              <img
                src={c.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-nfw-powder/30" />
            )}
          </div>

          {/* Right — copy */}
          <div className="space-y-7">
            {c.eyebrow && (
              <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-aubergine">
                {c.eyebrow}
              </p>
            )}
            <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine leading-[1.1]">
              {parts[0]}
              <em className="italic">{c.headline_italic_phrase}</em>
              {parts[1]}
            </h2>
            <p className="font-serif text-2xl text-nfw-blackberry">{c.body}</p>
            {c.cta_label && (
              <Link
                href={c.cta_url}
                className="inline-flex items-center justify-center px-8 py-4 bg-nfw-aubergine text-nfw-dove font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors"
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
