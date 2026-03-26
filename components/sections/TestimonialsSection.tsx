"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TestimonialsContent, BackgroundColor } from "@/lib/sections/types";

interface Props {
  content: Record<string, unknown>;
}

const RULE_CLASSES: Record<BackgroundColor, string> = {
  dove: "bg-nfw-aubergine",
  aubergine: "bg-nfw-citrine",
  wisteria: "bg-nfw-citrine",
  blackberry: "bg-nfw-citrine",
};

const DOT_ACTIVE: Record<BackgroundColor, string> = {
  dove: "bg-nfw-aubergine",
  aubergine: "bg-nfw-citrine",
  wisteria: "bg-nfw-citrine",
  blackberry: "bg-nfw-citrine",
};

const DOT_INACTIVE: Record<BackgroundColor, string> = {
  dove: "bg-nfw-blackberry/20",
  aubergine: "bg-nfw-dove/20",
  wisteria: "bg-nfw-dove/20",
  blackberry: "bg-nfw-dove/20",
};

export default function TestimonialsSection({ content }: Props) {
  const c = content as unknown as TestimonialsContent;
  const bg = (c.background ?? "dove") as BackgroundColor;
  const testimonials = c.testimonials ?? [];
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getTextColor = (): string => {
    switch (bg) {
      case "dove":
        return "text-nfw-blackberry";
      case "aubergine":
      case "wisteria":
      case "blackberry":
        return "text-white";
      default:
        return "text-nfw-blackberry";
    }
  };

  const getMutedColor = (): string => {
    switch (bg) {
      case "dove":
        return "text-nfw-blackberry/50";
      case "aubergine":
      case "wisteria":
      case "blackberry":
        return "text-white/50";
      default:
        return "text-nfw-blackberry/50";
    }
  };

  const getEyebrowColor = (): string => {
    switch (bg) {
      case "dove":
        return "text-nfw-blackberry/60";
      case "aubergine":
      case "wisteria":
      case "blackberry":
        return "text-nfw-dove";
      default:
        return "text-nfw-blackberry/60";
    }
  };

  const goTo = useCallback((index: number) => {
    setVisible(false);
    setTimeout(() => {
      setCurrent(index);
      setVisible(true);
    }, 350);
  }, []);

  const next = useCallback(() => {
    goTo((current + 1) % testimonials.length);
  }, [current, goTo, testimonials.length]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 6000);
  }, [next]);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer, testimonials.length]);

  if (testimonials.length === 0) return null;

  const t = testimonials[current];
  const textColor = getTextColor();
  const mutedColor = getMutedColor();
  const eyebrowColor = getEyebrowColor();

  return (
    <section className={`bg-nfw-${bg} py-24 lg:py-32`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {c.eyebrow && (
          <p
            className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-4`}
          >
            {c.eyebrow}
          </p>
        )}
        {c.heading && (
          <h2
            className={`font-serif text-3xl lg:text-6xl ${textColor} mb-16`}
          >
            {c.heading}
          </h2>
        )}

        {/* Animated testimonial */}
        <div className="relative min-h-[240px] flex flex-col items-center justify-center">
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 600ms ease, transform 600ms ease",
            }}
            className="flex flex-col items-center"
          >
            <blockquote
              className={`font-serif italic text-2xl lg:text-3xl ${textColor} leading-relaxed mb-8`}
            >
              &ldquo;{t.quote}&rdquo;
            </blockquote>

            <div className={`w-12 h-px ${RULE_CLASSES[bg]} mb-6`} />

            <p
              className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${mutedColor}`}
            >
              — {t.first_name}, {t.age}, {t.state}
            </p>
          </div>
        </div>

        {/* Dots */}
        {testimonials.length > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  goTo(i);
                  resetTimer();
                }}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === current
                    ? `${DOT_ACTIVE[bg]} w-8`
                    : `${DOT_INACTIVE[bg]} w-1.5`
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
