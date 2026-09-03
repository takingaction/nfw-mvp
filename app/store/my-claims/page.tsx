import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MyClaimsClient from "@/components/MyClaimsClient";
import { Suspense } from "react";
import Link from "next/link";

export const metadata = {
  title: "My Claims | Zero Dollar Store",
  description: "Track your claimed items from the Zero Dollar Store",
};

async function MyClaimsContent({
  nextUrl,
}: {
  nextUrl?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(nextUrl || "/store/my-claims")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, membership_level, profile_completed")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/profile");
  }

  if (!profile?.profile_completed) {
    redirect(`/auth/sign-up?step=1&next=${encodeURIComponent(nextUrl || "/store/my-claims")}`);
  }

  const { data: claims, error } = await supabase
    .from("zero_dollar_claims")
    .select("*")
    .eq("user_id", user.id)
    .order("claimed_at", { ascending: false });

  if (error) {
    console.error("Error fetching claims:", error);
    return <div className="text-red-600">Error loading your claims</div>;
  }

  let enrichedClaims = claims || [];

  if (claims && claims.length > 0) {
    try {
      const productsRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/shopify/products`,
        { cache: 'no-store' }
      );
      if (productsRes.ok) {
        const products = await productsRes.json();
        const productMap = new Map(
          products.map((p: { shopifyProductId: string; title: string; imageUrl: string; cardDescription: string }) => [
            p.shopifyProductId,
            { title: p.title, imageUrl: p.imageUrl, description: p.cardDescription }
          ])
        );

        enrichedClaims = claims.map(claim => ({
          ...claim,
          product: productMap.get(claim.shopify_product_id) || null,
        }));
      }
    } catch (err) {
      console.error("Error fetching product details:", err);
    }
  }

  return (
    <main className="min-h-screen bg-nfw-dove">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 py-16">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-2">
              My Claims
            </h1>
            <p className="font-sans text-sm text-nfw-blackberry/70">
              Track your claimed items and shipping status
            </p>
          </div>
          <Link
            href="/store"
            className="bg-nfw-citrine text-nfw-blackberry px-6 py-3 font-ui text-xs font-black tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
          >
            Browse Store
          </Link>
        </div>

        <MyClaimsClient claims={enrichedClaims} userName={profile.full_name || ""} />
      </div>
    </main>
  );
}

export default function MyClaimsPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const nextUrl = searchParams?.next;
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-nfw-dove">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 py-16">
            <div className="animate-pulse">
              <div className="h-10 bg-nfw-stone/20 rounded w-1/3 mb-4"></div>
              <div className="h-6 bg-nfw-stone/20 rounded w-2/3 mb-12"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white p-6">
                    <div className="h-6 bg-nfw-stone/20 rounded w-1/2 mb-4"></div>
                    <div className="h-4 bg-nfw-stone/20 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      }
    >
      <MyClaimsContent nextUrl={nextUrl} />
    </Suspense>
  );
}
