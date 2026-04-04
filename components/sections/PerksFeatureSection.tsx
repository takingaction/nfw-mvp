"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PerksFeatureContent } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getEyebrowColorForBackground,
  getPrimaryButtonClass,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

export default function PerksFeatureSection({ content }: Props) {
  const c = content as unknown as PerksFeatureContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const ctaClass = getPrimaryButtonClass(c.background);
  const parts = (c.headline || "").split(c.headline_italic_phrase || "");
  const shouldWhiteLogos = c.background && c.background !== "dove";
  const logos = c.logos ?? [];

  const [logoSetWidth, setLogoSetWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (logos.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    // Wait for images to load
    const images = container.querySelectorAll("img");
    let loadedCount = 0;

    const measureWidth = () => {
      // Get the width of ONE logo item (we'll measure the first one)
      const firstLogo = container.querySelector(".logo-item") as HTMLElement;
      const gap = 64; // gap-16 = 4rem = 64px
      if (firstLogo) {
        const logoWidth = firstLogo.offsetWidth;
        const totalWidth = (logoWidth + gap) * logos.length - gap;
        console.log("[LogoScroll] Single set width:", totalWidth, "(logo:", logoWidth, "gap:", gap, "count:", logos.length, ")");
        setLogoSetWidth(totalWidth);
      }
    };

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= images.length) {
        // Small delay to ensure layout is complete
        setTimeout(measureWidth, 50);
      }
    };

    if (images.length === 0) {
      measureWidth();
    } else {
      images.forEach((img) => {
        if (img.complete) {
          checkAllLoaded();
        } else {
          img.onload = checkAllLoaded;
          img.onerror = checkAllLoaded;
        }
      });
    }

    // Also measure on resize
    const resizeObserver = new ResizeObserver(() => {
      measureWidth();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [logos.length]);

  useEffect(() => {
    if (logoSetWidth === 0) return;

    // Speed: pixels per second
    const speed = 100;
    const startTime = performance.now();

    const animate = (time: number) => {
      // Calculate offset based on elapsed time - no accumulation
      const elapsedSeconds = (time - startTime) / 1000;
      const totalPixels = elapsedSeconds * speed;
      // Use modulo to get seamless loop position
      const displayOffset = totalPixels % logoSetWidth;

      setScrollPosition(displayOffset);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [logoSetWidth]);

  // 3x content for seamless loop
  const displayLogos = [...logos, ...logos, ...logos];

  return (
    <section className={`py-20 lg:py-28 ${bgClass}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="items-center">
          <div className="space-y-7 flex flex-col items-center">
            {c.eyebrow && (
              <p className={`font-ui text-xs font-black tracking-[0.06em] text-center uppercase ${eyebrowColor}`}>
                {c.eyebrow}
              </p>
            )}
            <h2 className={`font-serif text-4xl lg:text-6xl text-center ${textColor} !leading-[1.1]`}>
              {parts[0]}
              <em className="italic">{c.headline_italic_phrase}</em>
              {parts[1]}
            </h2>
            <p className={`font-serif text-2xl text-center ${textColor} opacity-80`}>
              {c.body}
            </p>
            {c.cta_label && (
              <Link
                href={c.cta_url}
                className={`inline-flex items-center justify-center px-8 py-4 ${ctaClass} font-ui font-black text-sm tracking-[0.06em] uppercase hover:opacity-90 transition-opacity`}
              >
                {c.cta_label}
              </Link>
            )}
          </div>
          <div />
        </div>
      </div>

      {logos.length > 0 && (
        <div className="border-t border-white/20 pt-12">
          {c.logo_strip_eyebrow && (
            <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase text-center ${eyebrowColor} mb-8`}>
              {c.logo_strip_eyebrow}
            </p>
          )}
          <div className="overflow-hidden">
            <div
              ref={containerRef}
              className="flex gap-16 items-center"
              style={{
                transform: `translateX(-${scrollPosition}px)`,
                width: "max-content",
              }}
            >
              {displayLogos.map((logo, i) => {
                const logoSrc = typeof logo.image_url === "string"
                  ? logo.image_url
                  : ((logo.image_url as { url?: string })?.url ?? "");
                if (!logoSrc) return null;
                return (
                  <div key={`${logo.name}-${i}`} className="logo-item flex-shrink-0 h-8 flex items-center">
                    <img
                      src={logoSrc}
                      alt={logo.name}
                      className="h-full w-auto object-contain"
                      style={shouldWhiteLogos ? { filter: 'brightness(0) invert(1)' } : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
