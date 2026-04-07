import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminArticlesClient from "@/components/admin/AdminArticlesClient";

export default async function AdminArticlesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  // Fetch all articles (published and unpublished)
  const { data: articles } = await supabase
    .from("articles")
    .select(
      `
      *,
      author:profiles(full_name),
      category:article_categories(name)
    `,
    )
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-7xl mx-auto">
        <AdminArticlesClient initialArticles={articles || []} />
      </div>
    </main>
  );
}
