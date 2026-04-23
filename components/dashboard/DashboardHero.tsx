"use client";

import Link from "next/link";

type DashboardHeroProps = {
  heroImage: string;
};

export default function DashboardHero({ heroImage }: DashboardHeroProps) {
  return (
    <div className="relative w-full h-[550px] overflow-hidden">
      {heroImage && (
        <img
          src={heroImage}
          alt="Dashboard hero"
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-nfw-blackberry/80 to-nfw-blackberry/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-8 w-full">
          <div className="max-w-2xl">
            <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-white/80 mb-3">
              Your Member Dashboard
            </p>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-normal text-white mb-6 font-serif whitespace-nowrap">
              Here to <em>help.</em>
            </h1>
            <div className="space-y-1 mb-8">
              <p className="text-4xl text-white/90 font-serif">Real support today.</p>
              <p className="text-4xl text-white/90 font-serif">Real power over time.</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/grants/apply"
                className="px-6 py-3 bg-[#7786BE] text-white hover:bg-[#7786BE]/90 transition-colors font-ui uppercase"
              >
                Apply for a Microgrant
              </Link>
              <Link
                href="/perks"
                className="px-6 py-3 bg-[#7786BE] text-white hover:bg-[#7786BE]/90 transition-colors font-ui uppercase"
              >
                Explore Perks
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
