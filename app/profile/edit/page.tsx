import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "@/components/ProfileClient";

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextUrl = searchParams?.next || "/profile/edit";
    redirect(`/auth/login?next=${encodeURIComponent(nextUrl)}`);
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/profile");
  }

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-4xl lg:text-6xl text-nfw-blackberry mb-8 leading-tight">Edit Profile</h1>
        <ProfileClient profile={profile} userEmail={user.email || ""} />
      </div>
    </main>
  );
}
