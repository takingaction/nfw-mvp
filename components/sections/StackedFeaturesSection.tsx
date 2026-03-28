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
    <section className="bg-nfw-dove py-16 lg:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
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
                  className={`flex-1 p-6 ${bgClass}`}
                  style={{ backgroundColor: col.image_url ? undefined : swatchColor }}
                >
                  {col.eyebrow && (
                    <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${textColor}`}>
                      {col.eyebrow}
                    </p>
                  )}
                  {col.heading && (
                    <h3 className={`font-serif text-2xl mb-3 italic ${textColor}`}>
                      {col.heading}
                    </h3>
                  )}
                  {col.body && (
                    <p className={`text-sm mb-4 leading-relaxed ${textColor}`}>
                      {col.body}
                    </p>
                  )}
                  {col.bullets && col.bullets.length > 0 && (
                    <ul className="space-y-2 mb-4">
                      {col.bullets.map((bullet, i) => (
                        <li key={i} className={`text-sm flex items-start gap-2 ${textColor}`}>
                          <span className="text-nfw-citrine mt-1">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {col.cta_label && col.cta_url && (
                    <Link
                      href={col.cta_url}
                      className={`inline-flex items-center justify-center px-6 py-3 bg-nfw-citrine text-nfw-blackberry font-bold text-sm transition-all hover:opacity-90`}
                    >
                      {col.cta_label}
                    </Link>
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
