"use client";

import { useEffect, useRef, useState } from "react";

interface Stat {
  value: number;
  suffix: string;
  label: string;
  prefix?: string;
}

export default function AnimatedStats() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const stats: Stat[] = [
    { value: 2.5, suffix: "M+", label: "in grants awarded", prefix: "$" },
    { value: 50000, suffix: "+", label: "members nationwide" },
    { value: 500, suffix: "", label: "avg savings per member", prefix: "$" },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="bg-[#2d1239] pb-16 lg:pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <StatCounter
              key={index}
              stat={stat}
              isVisible={isVisible}
              delay={index * 200}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCounter({
  stat,
  isVisible,
  delay,
}: {
  stat: Stat;
  isVisible: boolean;
  delay: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const timeout = setTimeout(() => {
      const duration = 2000;
      const steps = 60;
      const increment = stat.value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= stat.value) {
          setCount(stat.value);
          clearInterval(timer);
        } else {
          setCount(current);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(timeout);
  }, [isVisible, stat.value, delay]);

  const displayValue =
    stat.value < 100 ? count.toFixed(1) : Math.floor(count).toLocaleString();

  return (
    <div className="text-center">
      <div className="text-5xl lg:text-6xl font-black text-[#fdf493] mb-2 font-bold">
        {stat.prefix}
        {displayValue}
        {stat.suffix}
      </div>
      <div className="text-lg text-[#bcafcf]">{stat.label}</div>
    </div>
  );
}
