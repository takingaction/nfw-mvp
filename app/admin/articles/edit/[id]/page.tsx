import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ArticleForm from "@/components/ArticleForm";

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

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Edit Article</h1>
          <a
            href={`/articles/${article.slug}`}
            target="_blank"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Article →
          </a>
        </div>
        <ArticleForm
          categories={categories || []}
          userId={user.id}
          article={article}
        />
      </div>
    </main>
  );
}
