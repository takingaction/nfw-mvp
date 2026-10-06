import { createClient } from "@/lib/supabase/server";
import getAdminClient from "@/lib/supabase/admin";
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

  // Paginated fetch — Supabase default cap is 1000 rows.
  // TODO: Add client-side pagination to ArticlesClient when published articles > 1000.
  const PAGE_SIZE = 1000;
  const allArticles: any[] = [];
  let articlesPage = 0;
  let articlesHasMore = true;
  let articlesError: any = null;

  while (articlesHasMore) {
    const from = articlesPage * PAGE_SIZE;
    const { data: pageData, error: pageError } = await query
      .order("published_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (pageError) {
      articlesError = pageError;
      break;
    }

    if (pageData && pageData.length > 0) {
      allArticles.push(...pageData);
      articlesPage++;
      articlesHasMore = pageData.length === PAGE_SIZE;
    } else {
      articlesHasMore = false;
    }
  }

  const articles = articlesError ? null : allArticles;
  const error = articlesError;

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

  // Per-category counts via cheap { count: 'exact', head: true } queries.
  // One count query per category — bounded by # of categories (~10), not # of articles.
  const categoriesWithCounts = await Promise.all(
    (categories || []).map(async (cat) => {
      const { count } = await supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true)
        .eq("category_id", cat.id);
      return { ...cat, article_count: count || 0 };
    }),
  );

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

      // Fetch author (service role: profiles SELECT is own-row/admin only after migration 159,
      // but author names are public content)
      let author = null;
      if (article.author_id) {
        const { data: authorData } = await getAdminClient()
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
