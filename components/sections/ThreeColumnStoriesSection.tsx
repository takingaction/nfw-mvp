import Link from "next/link";
import Image from "next/image";
import { ThreeColumnStoriesContent } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getEyebrowColorForBackground,
  getCardBorderColorForBackground,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function ThreeColumnStoriesSection({ content }: Props) {
  const c = content as unknown as ThreeColumnStoriesContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const borderColor = getCardBorderColorForBackground(c.background);
  const linkColor = c.background === "dove" ? "text-nfw-aubergine" : "text-nfw-dove";

  return (
    <section className={`py-20 lg:py-28 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {c.eyebrow && (
          <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-8 text-center`}>
            {c.eyebrow}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {c.columns?.map((column, i) => {
            const imageSrc = column.image_url && column.image_url.length > 0 ? column.image_url : null;
            
            return (
              <div
                key={i}
                className={`border ${borderColor} flex flex-col overflow-hidden`}
              >
                <div className="relative aspect-[3/4] w-full bg-nfw-stone/20">
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-nfw-stone/20" />
                  )}
                </div>
                <div className="flex flex-col flex-grow p-6">
                  {column.eyebrow && (
                    <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-2`}>
                      {column.eyebrow}
                    </p>
                  )}
                  <h3 className={`font-serif text-xl ${textColor} mb-3 leading-snug`}>
                    {column.title}
                  </h3>
                  <p className={`font-sans text-sm ${textColor} opacity-70 leading-relaxed flex-grow`}>
                    {column.content}
                  </p>
                  {column.link_text && column.link_url && (
                    <div className="mt-auto pt-4">
                      <Link
                        href={column.link_url}
                        className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${linkColor} hover:opacity-80 transition-opacity`}
                      >
                        {column.link_text}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
