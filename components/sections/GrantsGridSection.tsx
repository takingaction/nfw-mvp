import Link from "next/link";
import Image from "next/image";
import { GrantsGridContent } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getMutedTextColorForBackground,
  getCardBorderColorForBackground,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function GrantsGridSection({ content }: Props) {
  const c = content as unknown as GrantsGridContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const mutedTextColor = getMutedTextColorForBackground(c.background);
  const cardBorderColor = getCardBorderColorForBackground(c.background);
  const cardBgClass = c.background === "dove" ? "bg-white" : "bg-white/10";

  return (
    <div className={`py-16 lg:py-24 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className={`font-serif text-4xl lg:text-6xl ${textColor} mb-4 leading-tight`}>
            {c.headline}
          </h2>
          {c.subheadline && (
            <p className={`font-serif text-2xl ${mutedTextColor}`}>
              {c.subheadline}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {c.cards?.map((grant, i) => (
            <div
              key={i}
              className={`border ${cardBorderColor} overflow-hidden ${cardBgClass}`}
            >
              <div className="relative h-44 overflow-hidden bg-[#EEE9F3]">
                <Image
                  src={grant.image_url}
                  alt={grant.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <p className={`font-serif text-xs ${mutedTextColor} mb-2`}>
                  {grant.closing}
                </p>
                <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-2">
                  {grant.title}
                </h3>
                <p className="font-serif text-sm text-nfw-blackberry/70 mb-4 line-clamp-2">
                  {grant.description}
                </p>
                <Link
                  href={c.cta_url}
                  className={`inline-flex items-center gap-1 font-ui text-sm font-medium ${c.background === "dove" ? "text-nfw-aubergine hover:text-nfw-blackberry" : "text-nfw-dove hover:text-white"} transition-colors`}
                >
                  {c.cta_label}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
