"use client";

import { useEffect, useRef, useState } from "react";
import { StatsBarContent } from "@/lib/sections/types";

interface Props {
  content: Record<string, unknown>;
}

function AnimatedStat({ value }: { value: string }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const numeric = parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (isNaN(numeric)) {
      setDisplay(value);
      return;
    }
    const suffix = value.replace(/[0-9,]/g, "");
    const duration = 1800;
    const step = (timestamp: number, startTime: number) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * numeric).toLocaleString() + suffix);
      if (progress < 1) requestAnimationFrame((t) => step(t, startTime));
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame((t) => step(t, t));
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref}>{display}</span>;
}

export default function StatsBarSection({ content }: Props) {
  const c = content as unknown as StatsBarContent;

  return (
    <section className="bg-nfw-wisteria py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {c.eyebrow && (
          <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-dove/60 text-center mb-12">
            {c.eyebrow}
          </p>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {c.stats?.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-serif text-5xl lg:text-6xl font-bold text-nfw-dove mb-2">
                <AnimatedStat value={stat.value} />
              </div>
              <p className="font-ui text-sm font-medium text-nfw-dove/60 tracking-wide uppercase">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
