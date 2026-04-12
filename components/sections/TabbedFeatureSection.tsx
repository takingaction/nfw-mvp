"use client";

import { useState } from "react";
import Link from "next/link";
import { TabbedFeatureContent } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getMutedTextColorForBackground,
  getEyebrowColorForBackground,
  getPrimaryButtonClass,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function TabbedFeatureSection({ content }: Props) {
  const c = content as unknown as TabbedFeatureContent;
  const [activeIndex, setActiveIndex] = useState(0);
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const mutedTextColor = getMutedTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const ctaClass = getPrimaryButtonClass(c.background);

  const items = c.items ?? [];
  const activeItem = items[activeIndex as number] ?? items[0];

  return (
    <div className={`py-20 lg:py-28 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tab Buttons */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex gap-0 bg-nfw-dove border border-nfw-blackberry/10 p-1">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`px-6 py-3 font-ui text-sm font-semibold transition-all ${
                  activeIndex === index
                    ? "bg-nfw-aubergine text-white shadow-sm"
                    : "text-nfw-blackberry hover:text-nfw-aubergine"
                }`}
              >
                {item.tab_label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeItem && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Image - Left side */}
            <div className="relative">
              {activeItem.image_url ? (
                <img
                  src={activeItem.image_url}
                  alt=""
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <div className="w-full aspect-[4/3] bg-nfw-blackberry/10 rounded-lg flex items-center justify-center">
                  <span className="text-nfw-blackberry/30 text-sm">No image</span>
                </div>
              )}
            </div>

            {/* Text + CTA - Right side */}
            <div>
              {activeItem.eyebrow && (
                <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-3`}>
                  {activeItem.eyebrow}
                </p>
              )}
              <h2 className={`font-serif text-4xl lg:text-5xl ${textColor} mb-6 leading-tight`}>
                {activeItem.headline}
                {activeItem.headline_italic_phrase && (
                  <span className="italic"> {activeItem.headline_italic_phrase}</span>
                )}
              </h2>
              {activeItem.body && (
                <p className={`font-serif text-xl ${mutedTextColor} mb-8 leading-relaxed`}>
                  {activeItem.body}
                </p>
              )}
              {activeItem.cta_label && activeItem.cta_url && (
                <Link
                  href={activeItem.cta_url}
                  className={`inline-flex items-center justify-center px-8 py-4 ${ctaClass} font-ui font-black text-sm tracking-[0.06em] uppercase hover:opacity-90 transition-opacity`}
                >
                  {activeItem.cta_label}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}