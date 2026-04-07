import { createClient } from "@/lib/supabase/server";
import ArticlesClient from "@/components/ArticlesClient";

export const metadata = {
  title: "Articles",
  description:
    "News, stories, and resources for women from the National Fund for Women.",
  openGraph: {
    title: "Articles | National Fund for Women",
    description: "News, stories, and resources for women.",
    url: "https://nationalfundforwomen.org/articles",
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630 }],
  },
};

async function ArticlesContent({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Build query
  let query = supabase.from("articles").select("*").eq("is_published", true);

  // Apply search filter
  if (params.search) {
    query = query.textSearch("search_vector", params.search, {
      type: "websearch",
      config: "english",
    });
  }

  // Apply category filter
  if (params.category) {
    const { data: category } = await supabase
      .from("article_categories")
      .select("id")
      .eq("slug", params.category)
      .single();

    if (category) {
      query = query.eq("category_id", category.id);
    }
  }

  const { data: articles, error } = await query.order("published_at", {
    ascending: false,
  });

  if (error) {
    return (
      <main className="min-h-screen p-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-black mb-4 text-[#2d1239]">
            Error Loading Articles
          </h1>
          <div className="bg-white/40 backdrop-blur-md rounded-3xl p-6 border-2 border-white/50 shadow-xl">
            <pre className="text-[#2d1239]/70 overflow-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        </div>
      </main>
    );
  }

  // Fetch categories with accurate article counts
  const { data: categories } = await supabase
    .from("article_categories")
    .select("*")
    .order("display_order", { ascending: true });

  // Get article counts per category
  const { data: articleCounts } = await supabase
    .from("articles")
    .select("category_id")
    .eq("is_published", true);

  // Calculate accurate counts
  const categoryCountMap = new Map<string, number>();
  (articleCounts || []).forEach((article) => {
    if (article.category_id) {
      categoryCountMap.set(
        article.category_id,
        (categoryCountMap.get(article.category_id) || 0) + 1,
      );
    }
  });

  // Enhance categories with accurate counts
  const categoriesWithCounts = (categories || []).map((cat) => ({
    ...cat,
    article_count: categoryCountMap.get(cat.id) || 0,
  }));

  // Get user's liked articles
  let likedArticleIds: string[] = [];
  if (user) {
    const { data: likes } = await supabase
      .from("article_likes")
      .select("article_id")
      .eq("user_id", user.id);

    likedArticleIds = likes?.map((like) => like.article_id) || [];
  }

  // Enhance articles with category and author data
  const articlesWithDetails = await Promise.all(
    (articles || []).map(async (article) => {
      // Fetch category
      let category = null;
      if (article.category_id) {
        const { data: categoryData } = await supabase
          .from("article_categories")
          .select("*")
          .eq("id", article.category_id)
          .single();
        category = categoryData;
      }

      // Fetch author
      let author = null;
      if (article.author_id) {
        const { data: authorData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", article.author_id)
          .single();
        author = authorData;
      }

      return {
        ...article,
        category,
        author,
        user_has_liked: likedArticleIds.includes(article.id),
      };
    }),
  );

  return (
    <ArticlesClient
      articles={articlesWithDetails}
      categories={categoriesWithCounts}
      currentCategory={params.category}
      currentSearch={params.search}
      userId={user?.id}
    />
  );
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  return <ArticlesContent searchParams={searchParams} />;
}
