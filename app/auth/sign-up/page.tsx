import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import SignUpFlow, { SignupData } from "@/components/SignUpFlow";

export const metadata = {
  title: "Become a Member | National Fund for Women",
  description:
    "Become a member and access a trusted nationwide women's community offering practical support, empowering resources, and exclusive benefits.",
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function getSignupData(): Promise<SignupData | null> {
  const { data } = await supabaseAdmin
    .from("site_signup")
    .select("*")
    .limit(1)
    .single();

  if (!data) return null;

  return {
    eyebrow: data.eyebrow,
    headline: data.headline,
    body_text: data.body_text,
    benefits: data.benefits || [],
    testimonial_text: data.testimonial_text || "",
    testimonial_author: data.testimonial_author || "",
  };
}

export default async function SignUpPage() {
  const signupData = await getSignupData();

  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SignUpFlow signupData={signupData} />
    </Suspense>
  );
}
