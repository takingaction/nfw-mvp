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
import RightSide3FeaturesSection from "./RightSide3FeaturesSection";
import FourCardsSection from "./4CardsSection";
import ThreeCardsSection from "./3CardsSection";
import ThreeColumnStoriesSection from "./ThreeColumnStoriesSection";

interface Props {
  sections: PageSection[];
}

export default function SectionRenderer({ sections }: Props) {
  return (
    <>
      {sections.map((section) => {
        const content = section.content as Record<string, unknown>;

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
          case "right_side_3_features":
            return <RightSide3FeaturesSection key={section.id} content={content} />;
          case "4_cards":
            return <FourCardsSection key={section.id} content={content} />;
          case "3_cards":
            return <ThreeCardsSection key={section.id} content={content} />;
          case "three_column_stories":
            return <ThreeColumnStoriesSection key={section.id} content={content} />;
          default:
            return null;
        }
      })}
    </>
  );
}
