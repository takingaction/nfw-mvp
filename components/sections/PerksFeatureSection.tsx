import Link from "next/link";
import { PerksFeatureContent } from "@/lib/sections/types";

interface Props {
  content: Record<string, unknown>;
}

export default function PerksFeatureSection({ content }: Props) {
  const c = content as unknown as PerksFeatureContent;
  const parts = c.headline.split(c.headline_italic_phrase);
  // Duplicate logos for seamless infinite scroll
  const logos = c.logos ?? [];
  const scrollLogos = [...logos, ...logos];

  return (
    <section className="bg-nfw-wisteria py-20 lg:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="items-center">
          {/* Left — copy */}
          <div className="space-y-7 flex flex-col items-center">
            {c.eyebrow && (
              <p className="font-ui text-xs font-black tracking-[0.06em] text-center uppercase text-nfw-dove">
                {c.eyebrow}
              </p>
            )}
            <h2 className="font-serif text-4xl lg:text-6xl text-white text-center !leading-[1.1]">
              {parts[0]}
              <em className="italic">{c.headline_italic_phrase}</em>
              {parts[1]}
            </h2>
            <p className="font-serif text-2xl text-center text-white">
              {c.body}
            </p>
            {c.cta_label && (
              <Link
                href={c.cta_url}
                className="inline-flex items-center justify-center px-8 py-4 bg-nfw-citrine text-nfw-blackberry font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
              >
                {c.cta_label}
              </Link>
            )}
          </div>
          <div />
        </div>
      </div>

      {logos.length > 0 && (
        <div className="border-t border-nfw-dove/20 pt-12">
          {c.logo_strip_eyebrow && (
            <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-white text-center mb-8">
              {c.logo_strip_eyebrow}
            </p>
          )}
          <div className="overflow-hidden">
            <div
              className="flex gap-16 items-center"
              style={{
                animation: "scroll-logos 20s linear infinite",
                width: "max-content",
                willChange: "transform",
              }}
            >
              {/* Triple the logos for smoother loop */}
              {[...logos, ...logos, ...logos].map((logo, i) => (
                <div key={i} className="flex-shrink-0 h-8 flex items-center">
                  <img
                    src={
                      typeof logo.image_url === "string"
                        ? logo.image_url
                        : ((logo.image_url as any)?.url ?? "")
                    }
                    alt={logo.name}
                    className="h-full w-auto object-contain brightness-0 invert opacity-100"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
