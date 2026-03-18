import { MissionQuoteContent } from "@/lib/sections/types";

interface Props {
  content: Record<string, unknown>;
}

export default function MissionQuoteSection({ content }: Props) {
  const c = content as MissionQuoteContent;

  return (
    <section className="bg-nfw-dove py-32 lg:py-40">
      <div className="w-full px-16 lg:px-24 text-center">
        {c.eyebrow && (
          <p className="font-ui text-xs font-black tracking-[0.08em] uppercase text-nfw-aubergine mb-6">
            {c.eyebrow}
          </p>
        )}
        <blockquote className="font-serif italic text-3xl lg:text-4xl xl:text-[58px] text-nfw-aubergine !leading-[1.2]">
          {c.quote_text}
        </blockquote>
      </div>
    </section>
  );
}
