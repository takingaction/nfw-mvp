import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import SignUpFlow from "@/components/SignUpFlow";

export const metadata = {
  title: "Become a Member | National Fund for Women",
  description:
    "Become a member and access a trusted nationwide women's community offering practical support, empowering resources, and exclusive benefits.",
};

export default async function SignUpPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SignUpFlow />
    </Suspense>
  );
}