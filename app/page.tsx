import Hero from "@/components/landing/Hero";
import StatsSection from "@/components/landing/StatsSection";
import LittleGoesLongWay from "@/components/landing/LittleGoesLongWay";
import RealHelp from "@/components/landing/RealHelp";
import EverydaySavings from "@/components/landing/EverydaySavings";
import ZeroDollarStore from "@/components/landing/ZeroDollarStore";
import SmallWins from "@/components/landing/SmallWins";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";

export const metadata = {
  title: 'National Fund for Women',
  description: 'Uplifting American women through microgrants, perks, discounts, and more. Join today!',
  openGraph: {
    title: 'National Fund for Women',
    description: 'Uplifting American women through microgrants, perks, discounts, and more. Join today!',
    url: 'https://nationalfundforwomen.org',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default function Home() {
  return (
    <>
      <Hero />
      <StatsSection />
      <LittleGoesLongWay />
      <RealHelp />
      <EverydaySavings />
      <ZeroDollarStore />
      <SmallWins />
      <FAQ />
      <FinalCTA />
    </>
  );
}