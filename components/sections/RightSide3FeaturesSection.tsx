import Link from "next/link";
import { RightSide3FeaturesContent } from "@/lib/sections/types";

interface Props {
  content: Record<string, unknown>;
}

export default function RightSide3FeaturesSection({ content }: Props) {
  const c = content as unknown as RightSide3FeaturesContent;

  return (
    <div className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            {c.eyebrow && (
              <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-3">
                {c.eyebrow}
              </p>
            )}
            <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-6 leading-tight">
              {c.headline}
            </h2>
            {c.body && (
              <div className="space-y-4 mb-8">
                {c.body.split("\n\n").map((paragraph, i) => (
                  <p key={i} className="font-serif text-2xl text-nfw-blackberry/70 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
            {c.cta_label && c.cta_url && (
              <Link
                href={c.cta_url}
                className="inline-flex items-center justify-center px-8 py-4 bg-nfw-citrine text-nfw-blackberry font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
              >
                {c.cta_label}
              </Link>
            )}
          </div>
          <div className="space-y-4">
            {c.items?.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 p-6 border border-nfw-blackberry/10 ${item.bg || "bg-nfw-blackberry/5"}`}
              >
                <div>
                  <p className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-1">
                    {item.title}
                  </p>
                  <p className="font-sans text-sm text-nfw-blackberry/60">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
