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

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  useEffect(() => {
    if (logos.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    // Get the width of the FIRST set of logos (one half of the container)
    let singleSetWidth = 0;

    const calculateWidths = () => {
      // The container has 2x logos, so half is one set
      singleSetWidth = container.scrollWidth / 2;
    };

    // Initial calculation
    calculateWidths();

    // Recalculate after images load
    const images = container.querySelectorAll("img");
    images.forEach((img) => {
      if (!img.complete) {
        img.onload = calculateWidths;
      }
    });

    // Animation parameters
    const speed = 50; // pixels per second

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const delta = timestamp - lastTimeRef.current;
      const movement = (speed * delta) / 1000;

      setScrollPosition((prev) => {
        const newPosition = prev + movement;

        // When we've scrolled one full set width, reset to 0 seamlessly
        if (newPosition >= singleSetWidth) {
          // This creates the seamless loop
          return newPosition - singleSetWidth;
        }

        return newPosition;
      });

      lastTimeRef.current = timestamp;
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    // Recalculate on resize
    const handleResize = () => {
      calculateWidths();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [logos.length]);

  // We need at least 2 sets for the infinite scroll effect
  const displayLogos = logos.length >= 5 ? [...logos, ...logos, ...logos] : [...logos, ...logos];

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
                  <div key={`${logo.name}-${i}`} className="flex-shrink-0 h-8 flex items-center">
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
