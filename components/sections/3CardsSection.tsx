import Link from "next/link";
import { ThreeCardsContent } from "@/lib/sections/types";

interface Props {
  content: Record<string, unknown>;
}

export default function ThreeCardsSection({ content }: Props) {
  const c = content as unknown as ThreeCardsContent;

  return (
    <div className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          {c.eyebrow && (
            <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-3">
              {c.eyebrow}
            </p>
          )}
          <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-4 leading-tight">
            {c.headline}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {c.cards?.map((card, i) => (
            <div
              key={i}
              className="border border-nfw-blackberry/10 p-8"
            >
              <div
                className="w-14 h-14 mb-6"
                style={{ backgroundColor: `${card.color}50` }}
              />
              <h3 className="font-ui text-sm font-black tracking-[0.06em] uppercase text-nfw-blackberry mb-3">
                {card.title}
              </h3>
              <p className="font-sans text-nfw-blackberry/60 mb-6 leading-relaxed">
                {card.description}
              </p>
              <Link
                href={card.link}
                className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-aubergine hover:underline"
              >
                {card.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
