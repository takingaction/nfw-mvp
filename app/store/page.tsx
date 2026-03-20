import { createClient } from "@/lib/supabase/server";
import StoreClient from "@/components/StoreClient";

export const metadata = {
  title: "Zero Dollar Store",
  description:
    "Free items for NFW members. Claim yours today — no cost, no catch.",
  openGraph: {
    title: "Zero Dollar Store | National Fund for Women",
    description: "Free items for NFW members. Claim yours today.",
    url: "https://nationalfundforwomen.org/store",
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630 }],
  },
};

export default async function StorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userTier = "free";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("membership_level")
      .eq("id", user.id)
      .single();

    userTier = profile?.membership_level || "free";
  }

  return <StoreClient userId={user?.id} userTier={userTier} />;
}
