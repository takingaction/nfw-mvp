import { createClient } from "@supabase/supabase-js";
import ContactClient from "@/components/contact/ContactClient";

interface HelpCard {
  icon: string;
  title: string;
  content: string;
  email?: string;
}

interface QuickLink {
  label: string;
  url: string;
}

interface ContactData {
  id: string;
  hero_eyebrow: string;
  hero_headline: string;
  hero_subheadline: string;
  help_heading: string;
  help_intro: string;
  help_cards: HelpCard[];
  quick_links: QuickLink[];
  not_member_heading: string;
  not_member_subheading: string;
  meta_title: string | null;
  meta_description: string | null;
}

const defaultData: ContactData = {
  id: "",
  hero_eyebrow: "Real people, real responses",
  hero_headline: "Contact Member Support",
  hero_subheadline: "Whether you have a question, need support, or just want to say hi — we're here and we're listening.",
  help_heading: "How can we help?",
  help_intro: "Our team is made up of real women who care deeply about this community. We read every message and do our best to respond within one business day.",
  help_cards: [
    {
      icon: "mail",
      title: "Email us directly",
      content: "We typically respond within one business day. For urgent grant-related questions, please note that in your message.",
      email: "michelle@nationalfundforwomen.org",
    },
    {
      icon: "clock",
      title: "Response time",
      content: "We typically respond within one business day. For urgent grant-related questions, please note that in your message.",
    },
    {
      icon: "heart",
      title: "A note from us",
      content: "No question is too small. Whether you need help with your account, have a grant question, or just want to share your story — we want to hear it.",
    },
  ],
  quick_links: [
    { label: "Microgrant FAQs", url: "/faq" },
    { label: "Pricing and Plans", url: "/pricing" },
    { label: "Perks and Discounts", url: "/perks/info" },
    { label: "Apply for a Grant", url: "/grants/apply" },
  ],
  not_member_heading: "Not a member yet?",
  not_member_subheading: "Join thousands of women who have already found relief, connection, and real support through NFW. It's free to get started.",
  meta_title: "Member Support & Contact | National Fund for Women",
  meta_description: "Need help with membership, resources, or support services? Contact our team for friendly guidance and personalized assistance.",
};

export async function generateMetadata() {
  return {
    title: "Member Support & Contact | National Fund for Women",
    description: "Need help with membership, resources, or support services? Contact our team for friendly guidance and personalized assistance.",
  };
}

export default async function ContactPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: contactData } = await supabaseAdmin
    .from("site_contact")
    .select("*")
    .limit(1)
    .single();

  const data = contactData ? { ...defaultData, ...contactData } : defaultData;

  return <ContactClient contactData={data} />;
}