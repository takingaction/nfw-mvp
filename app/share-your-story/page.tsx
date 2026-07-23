import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ShareStoryClient from "@/components/dashboard/ShareStoryClient";

export default async function ShareYourStoryPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextUrl = searchParams?.next || "/share-your-story";
    redirect(`/auth/login?next=${encodeURIComponent(nextUrl)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, date_of_birth, city, state")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen bg-nfw-dove py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <ShareStoryClient profile={profile} />
      </div>
    </main>
  );
}