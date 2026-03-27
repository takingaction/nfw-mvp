"use client";

import Link from "next/link";
import { MemberCelebrationGridContent, BackgroundColor } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getMutedTextColorForBackground,
  getPrimaryButtonClass,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

const IMAGE_FALLBACK_COLORS = [
  "bg-nfw-lilac",
  "bg-nfw-citrine",
  "bg-nfw-powder",
  "bg-nfw-lilac",
];

export default function MemberCelebrationGridSection({ content }: Props) {
  const c = content as unknown as MemberCelebrationGridContent;
  const bg = (c.background ?? "dove") as BackgroundColor;

  const textColor = getTextColorForBackground(bg);
  const mutedColor = getMutedTextColorForBackground(bg);
  const buttonClass = getPrimaryButtonClass(bg);

  const images = [
    { url: c.image1_url, fallback: IMAGE_FALLBACK_COLORS[0] },
    { url: c.image2_url, fallback: IMAGE_FALLBACK_COLORS[1] },
    { url: c.image3_url, fallback: IMAGE_FALLBACK_COLORS[2] },
    { url: c.image4_url, fallback: IMAGE_FALLBACK_COLORS[3] },
  ];

  return (
    <section className={`${getBackgroundClass(bg)} py-16 lg:py-24 overflow-hidden`}>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            {c.eyebrow && (
              <p className={`text-xs font-semibold uppercase tracking-widest ${mutedColor}`}>
                {c.eyebrow}
              </p>
            )}
            {c.headline && (
              <h2 className={`font-serif text-4xl lg:text-6xl ${textColor}`}>
                {c.headline}
              </h2>
            )}
            {c.body && (
              <p className={`text-lg ${mutedColor}`}>
                {c.body}
              </p>
            )}
            {c.cta_label && c.cta_url && (
              <Link
                href={c.cta_url}
                className={`inline-flex items-center justify-center px-8 py-4 ${buttonClass} font-bold text-lg transition-all hover:opacity-90`}
              >
                {c.cta_label}
              </Link>
            )}
          </div>
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <div className={`aspect-square ${images[0].fallback}`}>
                  {images[0].url && (
                    <img
                      src={images[0].url}
                      alt="NFW Member"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="relative mt-8">
                <div className={`aspect-square ${images[1].fallback}`}>
                  {images[1].url && (
                    <img
                      src={images[1].url}
                      alt="NFW Member"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="relative -mt-4">
                <div className={`aspect-square ${images[2].fallback}`}>
                  {images[2].url && (
                    <img
                      src={images[2].url}
                      alt="NFW Member"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="relative">
                <div className={`aspect-square ${images[3].fallback}`}>
                  {images[3].url && (
                    <img
                      src={images[3].url}
                      alt="NFW Member"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
