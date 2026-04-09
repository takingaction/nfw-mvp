import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import EditArticleClient from "@/components/admin/EditArticleClient";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // Fetch the article
  const { data: article, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !article) {
    notFound();
  }

  // Fetch categories
  const { data: categories } = await supabase
    .from("article_categories")
    .select("*")
    .order("display_order", { ascending: true });

  // Fetch admin users for author dropdown
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_admin", true)
    .order("full_name", { ascending: true });

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-5xl mx-auto">
        <EditArticleClient
          initialCategories={categories || []}
          authors={authors || []}
          userId={user.id}
          article={article}
        />
      </div>
    </main>
  );
}
