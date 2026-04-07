import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ArticleForm from "@/components/ArticleForm";

export default async function NewArticlePage() {
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

  // Fetch categories
  const { data: categories } = await supabase
    .from("article_categories")
    .select("*")
    .order("display_order", { ascending: true });

  // Fetch admin users for author dropdown
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("is_admin", true)
    .order("full_name", { ascending: true });

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-nfw-blackberry font-serif">Create New Article</h1>
        <ArticleForm categories={categories || []} authors={authors || []} userId={user.id} />
      </div>
    </main>
  );
}
