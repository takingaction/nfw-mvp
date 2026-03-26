import { PageSection } from "@/lib/sections/types";
import HeroSection from "./HeroSection";
import HeroVideoSection from "./HeroVideoSection";
import StatsBarSection from "./StatsBarSection";
import MissionQuoteSection from "./MissionQuoteSection";
import ThreeColFeaturesSection from "./ThreeColFeaturesSection";
import SplitWhyNfwSection from "./SplitWhyNfwSection";
import MicrograntFeatureSection from "./MicrograntFeatureSection";
import PerksFeatureSection from "./PerksFeatureSection";
import ZeroDollarStoreTeaserSection from "./ZeroDollarStoreTeaserSection";
import SplitEverydaySection from "./SplitEverydaySection";
import TestimonialsSection from "./TestimonialsSection";
import FaqSection from "./FaqSection";
import MembershipCtaSection from "./MembershipCtaSection";

interface Props {
  sections: PageSection[];
}

export default function SectionRenderer({ sections }: Props) {
  console.log("SectionRenderer received:", sections.map(s => ({ type: s.section_type, id: s.id })));
  
  return (
    <>
      {sections.map((section) => {
        const content = section.content as Record<string, unknown>;
        console.log("Rendering section:", section.section_type, "content keys:", Object.keys(content));

        switch (section.section_type) {
          case "hero":
            return <HeroSection key={section.id} content={content} />;
          case "hero_video":
            return <HeroVideoSection key={section.id} content={content} />;
          case "stats_bar":
            return <StatsBarSection key={section.id} content={content} />;
          case "mission_quote":
            return <MissionQuoteSection key={section.id} content={content} />;
          case "three_col_features":
            return (
              <ThreeColFeaturesSection key={section.id} content={content} />
            );
          case "split_why_nfw":
            return <SplitWhyNfwSection key={section.id} content={content} />;
          case "microgrant_feature":
            return (
              <MicrograntFeatureSection key={section.id} content={content} />
            );
          case "perks_feature":
            return <PerksFeatureSection key={section.id} content={content} />;
          case "zero_dollar_store_teaser":
            return (
              <ZeroDollarStoreTeaserSection
                key={section.id}
                content={content}
              />
            );
          case "split_everyday":
            return <SplitEverydaySection key={section.id} content={content} />;
          case "testimonials":
            return <TestimonialsSection key={section.id} content={content} />;
          case "faq":
            return <FaqSection key={section.id} content={content} />;
          case "membership_cta":
            return <MembershipCtaSection key={section.id} content={content} />;
          default:
            return null;
        }
      })}
    </>
  );
}
