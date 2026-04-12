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
import PricingHeroSection from "./PricingHeroSection";
import PricingCardsSection from "./PricingCardsSection";
import PricingCtaBoxSection from "./PricingCtaBoxSection";
import PricingComparisonSection from "./PricingComparisonSection";
import PricingBenefitsSection from "./PricingBenefitsSection";
import PricingFinalCtaSection from "./PricingFinalCtaSection";
import HowItWorksSection from "./HowItWorksSection";
import BenefitsCheckmarksSection from "./BenefitsCheckmarksSection";
import GrantsHeroSection from "./GrantsHeroSection";
import GrantsGridSection from "./GrantsGridSection";
import GrantAmountCardsSection from "./GrantAmountCardsSection";
import SuccessStoriesSection from "./SuccessStoriesSection";
import PerksStoreGridSection from "./PerksStoreGridSection";
import TestimonialsGridSection from "./TestimonialsGridSection";
import MemberCelebrationGridSection from "./MemberCelebrationGridSection";
import StackedFeaturesSection from "./StackedFeaturesSection";
import TabbedFeatureSection from "./TabbedFeatureSection";

interface Props {
  sections: PageSection[];
}

export default function SectionRenderer({ sections }: Props) {
  return (
    <>
      {sections.map((section) => {
        const content = (section.content || {}) as Record<string, unknown>;

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
          case "pricing_hero":
            return <PricingHeroSection key={section.id} content={content} />;
          case "pricing_cards":
            return <PricingCardsSection key={section.id} content={content} />;
          case "pricing_cta_box":
            return <PricingCtaBoxSection key={section.id} content={content} />;
          case "pricing_comparison":
            return <PricingComparisonSection key={section.id} content={content} />;
          case "pricing_benefits":
            return <PricingBenefitsSection key={section.id} content={content} />;
          case "pricing_final_cta":
            return <PricingFinalCtaSection key={section.id} content={content} />;
          case "how_it_works":
            return <HowItWorksSection key={section.id} content={content} />;
          case "benefits_checkmarks":
            return <BenefitsCheckmarksSection key={section.id} content={content} />;
          case "grants_hero":
            return <GrantsHeroSection key={section.id} content={content} />;
          case "grants_grid":
            return <GrantsGridSection key={section.id} content={content} />;
          case "grant_amount_cards":
            return <GrantAmountCardsSection key={section.id} content={content} />;
          case "success_stories":
            return <SuccessStoriesSection key={section.id} content={content} />;
          case "perks_store_grid":
            return <PerksStoreGridSection key={section.id} content={content} />;
          case "testimonials_grid":
            return <TestimonialsGridSection key={section.id} content={content} />;
          case "member_celebration_grid":
            return <MemberCelebrationGridSection key={section.id} content={content} />;
          case "stacked_features":
            return <StackedFeaturesSection key={section.id} content={content} />;
          case "tabbed_feature":
            return <TabbedFeatureSection key={section.id} content={content} />;
          default:
            return null;
        }
      })}
    </>
  );
}
