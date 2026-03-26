import { MissionQuoteContent } from "@/lib/sections/types";
import { getBackgroundClass, getTextColorForBackground, getEyebrowColorForBackground } from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function MissionQuoteSection({ content }: Props) {
  const c = content as unknown as MissionQuoteContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);

  return (
    <section className={`${bgClass} py-32 lg:py-40`}>
      <div className="w-full px-16 lg:px-24 text-center">
        {c.eyebrow && (
          <p className={`font-ui text-xs font-black tracking-[0.08em] uppercase ${eyebrowColor} mb-6`}>
            {c.eyebrow}
          </p>
        )}
        <blockquote className={`font-serif italic text-3xl lg:text-4xl xl:text-[58px] ${textColor} !leading-[1.2]`}>
          {c.quote_text}
        </blockquote>
      </div>
    </section>
  );
}
