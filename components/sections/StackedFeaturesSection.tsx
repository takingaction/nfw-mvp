"use client";

import Link from "next/link";
import { StackedFeaturesContent, CardSwatchColor } from "@/lib/sections/types";
import { getCardSwatchColor } from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

const BG_COLOR_MAP: Record<CardSwatchColor, string> = {
  yellow: "bg-[#fdf493]",
  green: "bg-[#d4f1ad]",
  blue: "bg-[#b2d1ee]",
  lavender: "bg-[#bcafcf]",
  citrine: "bg-[#e8d5a3]",
  lilac: "bg-[#c9b8d9]",
  powder: "bg-[#b8c5d6]",
};

const TEXT_COLOR_MAP: Record<CardSwatchColor, string> = {
  yellow: "text-nfw-blackberry",
  green: "text-nfw-blackberry",
  blue: "text-nfw-blackberry",
  lavender: "text-nfw-blackberry",
  citrine: "text-nfw-blackberry",
  lilac: "text-nfw-blackberry",
  powder: "text-nfw-blackberry",
};

export default function StackedFeaturesSection({ content }: Props) {
  const c = content as unknown as StackedFeaturesContent;
  const columns = c.columns ?? [];

  if (columns.length === 0) return null;

  return (
    <section className="bg-nfw-dove overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 h-full">
        {columns.map((col, index) => {
          const bgClass = BG_COLOR_MAP[col.bg_color] || "bg-nfw-stone/20";
          const textColor = TEXT_COLOR_MAP[col.bg_color] || "text-nfw-blackberry";
          const swatchColor = getCardSwatchColor(col.bg_color);

          return (
            <div
              key={index}
              className="flex flex-col h-full"
            >
              <div className="relative aspect-[4/3] bg-nfw-stone/20 overflow-hidden flex-shrink-0">
                {col.image_url ? (
                  <>
                    <img
                      src={col.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    {col.image_overlay && (
                      <div className="absolute inset-0 bg-nfw-blackberry/50" />
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 bg-nfw-stone/30" />
                )}
              </div>
              <div
                className={`flex-1 px-10 py-12 ${bgClass}`}
                style={{ backgroundColor: col.image_url ? undefined : swatchColor }}
              >
                {col.eyebrow && (
                  <p className={`font-ui text-xs font-black tracking-[0.08em] uppercase mb-auto ${textColor}`}>
                    {col.eyebrow}
                  </p>
                )}
                <div className="flex-1 flex flex-col justify-center py-8">
                  {col.heading && (
                    <h3 className={`font-serif italic text-2xl lg:text-3xl mb-4 leading-snug ${textColor}`}>
                      {col.heading}
                    </h3>
                  )}
                  {col.body && (
                    <p className={`font-serif text-base leading-snug ${textColor}`}>
                      {col.body}
                    </p>
                  )}
                  {col.bullets && col.bullets.length > 0 && (
                    <ul className="space-y-2 mt-4 list-disc list-outside ml-6">
                      {col.bullets.map((bullet, i) => (
                        <li key={i} className={`font-serif text-base leading-snug pl-1 ${textColor}`}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {col.cta_label && col.cta_url && (
                  <div className="mt-auto">
                    <Link
                      href={col.cta_url}
                      className="font-ui text-base font-black tracking-[0.08em] uppercase text-nfw-citrine hover:opacity-70 transition-opacity"
                    >
                      {col.cta_label}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
