import Hero from "@/components/landing/Hero";
import StatsSection from "@/components/landing/StatsSection";
import LittleGoesLongWay from "@/components/landing/LittleGoesLongWay";
import RealHelp from "@/components/landing/RealHelp";
import EverydaySavings from "@/components/landing/EverydaySavings";
import ZeroDollarStore from "@/components/landing/ZeroDollarStore";
import SmallWins from "@/components/landing/SmallWins";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";

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