"use client";

import Link from "next/link";

type DashboardHeroProps = {
  heroImage: string;
};

export default function DashboardHero({ heroImage }: DashboardHeroProps) {
  return (
    <div className="relative w-full h-[400px] overflow-hidden">
      {heroImage && (
        <img
          src={heroImage}
          alt="Dashboard hero"
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-nfw-blackberry/80 to-nfw-blackberry/30" />
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-8 w-full">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-widest text-white/80 mb-3 font-ui uppercase">
              Your Member Dashboard
            </p>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 font-serif">
              Here to <em>help.</em>
            </h1>
            <div className="space-y-1 mb-8">
              <p className="text-xl text-white/90 font-serif">Real support today.</p>
              <p className="text-xl text-white/90 font-serif">Real power over time.</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/grants/apply"
                className="px-6 py-3 bg-[#7786BE] text-white font-bold hover:bg-[#7786BE]/90 transition-colors font-ui"
              >
                Apply for a Microgrant
              </Link>
              <Link
                href="/perks"
                className="px-6 py-3 bg-[#7786BE] text-white font-bold hover:bg-[#7786BE]/90 transition-colors font-ui"
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
