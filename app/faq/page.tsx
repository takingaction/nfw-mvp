import { createClient } from "@supabase/supabase-js";
import FaqClient from "@/components/faq/FaqClient";

interface FaqQuestion {
  question: string;
  answer: string;
}

interface FaqSection {
  category: string;
  questions: FaqQuestion[];
}

interface FaqButton {
  label: string;
  url: string;
  style: "solid" | "ghost";
  open_in_new_tab: boolean;
}

interface FaqData {
  id: string;
  hero_eyebrow: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_background: string;
  faq_sections: FaqSection[];
  still_have_questions_heading: string;
  still_have_questions_subheading: string;
  still_have_questions_buttons: FaqButton[];
  meta_title: string | null;
  meta_description: string | null;
}

const defaultData: FaqData = {
  id: "",
  hero_eyebrow: "We've got answers",
  hero_headline: "Frequently Asked Questions",
  hero_subheadline: "Everything you need to know about NFW membership, microgrants, perks, and more.",
  hero_background: "aubergine",
  faq_sections: [],
  still_have_questions_heading: "Still have questions?",
  still_have_questions_subheading: "We're here to help. Reach out and a real person will get back to you.",
  still_have_questions_buttons: [
    { label: "Contact Us", url: "/contact", style: "solid", open_in_new_tab: false },
    { label: "Join for Free", url: "/auth/sign-up", style: "ghost", open_in_new_tab: false },
  ],
  meta_title: "FAQs | National Fund for Women",
  meta_description: "Find answers to common questions about membership, financial support, perks, resources, and how National Fund for Women works.",
};

export async function generateMetadata() {
  return {
    title: "FAQs | National Fund for Women",
    description: "Find answers to common questions about membership, financial support, perks, resources, and how National Fund for Women works.",
  };
}

export default async function FAQPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: faqData } = await supabaseAdmin
    .from("site_faq")
    .select("*")
    .limit(1)
    .single();

  const data = faqData ? { ...defaultData, ...faqData } : defaultData;

  return <FaqClient faqData={data} />;
}