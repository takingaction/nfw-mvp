"use client";

import { useEffect, useRef, useState } from "react";

type MembershipImpactCardProps = {
  totalSavings: number;
  micrograntsSavings: number;
  perksSavings: number;
  zeroDollarStoreSavings: number;
};

function AnimatedCurrency({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const duration = 1800;
    const step = (timestamp: number, startTime: number) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = progress >= 1 ? value : Math.round(eased * value);
      setDisplay(currentValue);
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

  return (
    <span ref={ref}>
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(display)}
    </span>
  );
}

export default function MembershipImpactCard({
  totalSavings,
  micrograntsSavings,
  perksSavings,
  zeroDollarStoreSavings,
}: MembershipImpactCardProps) {
  return (
    <div className="p-6 flex flex-col items-center justify-center">
      <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-white/80 mb-4">
        Your Membership at Work
      </p>

      <h1 className="text-8xl md:text-9xl font-normal text-white font-serif mb-8">
        {new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(totalSavings)} saved
      </h1>

      <div className="w-full bg-nfw-lilac p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-6xl text-white font-serif">
              <AnimatedCurrency value={micrograntsSavings} />
            </p>
            <p className="text-lg text-white/60 font-ui uppercase mt-1">From Microgrants</p>
          </div>
          <div className="text-center border-x border-white/10">
            <p className="text-6xl text-white font-serif">
              <AnimatedCurrency value={perksSavings} />
            </p>
            <p className="text-lg text-white/60 font-ui uppercase mt-1">From Perks</p>
          </div>
          <div className="text-center">
            <p className="text-6xl text-white font-serif">
              <AnimatedCurrency value={zeroDollarStoreSavings} />
            </p>
            <p className="text-lg text-white/60 font-ui uppercase mt-1">From the Zero Dollar Store</p>
          </div>
        </div>
      </div>
    </div>
  );
}