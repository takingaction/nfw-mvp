"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, X, Heart } from "lucide-react";
import { ArticleWithDetails, ArticleCategory } from "@/types/articles";
import { createClient } from "@/lib/supabase/client";

export default function ArticlesClient({
  articles,
  categories,
  currentCategory,
  currentSearch,
  userId,
}: {
  articles: ArticleWithDetails[];
  categories: ArticleCategory[];
  currentCategory?: string;
  currentSearch?: string;
  userId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(currentSearch || "");
  const [likingArticleId, setLikingArticleId] = useState<string | null>(null);
  const supabase = createClient();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery) {
      params.set("search", searchQuery);
    } else {
      params.delete("search");
    }
    router.push(`/articles?${params.toString()}`);
  };

  const handleCategoryFilter = (categorySlug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categorySlug) {
      params.set("category", categorySlug);
    } else {
      params.delete("category");
    }
    router.push(`/articles?${params.toString()}`);
  };

  const handleLike = async (articleId: string, currentlyLiked: boolean) => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }

    setLikingArticleId(articleId);

    try {
      if (currentlyLiked) {
        await supabase
          .from("article_likes")
          .delete()
          .eq("article_id", articleId)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("article_likes")
          .insert({ article_id: articleId, user_id: userId });
      }
      router.refresh();
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLikingArticleId(null);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-nfw-blackberry pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-nfw-dove mb-2 font-serif">
            Articles & Resources
          </h2>
          <p className="text-nfw-lilac">
            Stories, tips, and resources to help you thrive.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-nfw-dove p-4 mb-6 border border-nfw-blackberry/10">
          <form onSubmit={handleSearch}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nfw-blackberry/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-nfw-blackberry/10 text-nfw-blackberry placeholder-nfw-blackberry/40 focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-nfw-blackberry text-nfw-dove font-semibold hover:bg-nfw-blackberry/90 transition-colors"
              >
                Search
              </button>
              {(currentSearch || currentCategory) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    router.push("/articles");
                  }}
                  className="px-3 py-2.5 bg-white border border-nfw-blackberry/10 text-nfw-blackberry/60 hover:bg-nfw-blackberry/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => handleCategoryFilter(null)}
              className={`px-4 py-2 whitespace-nowrap font-semibold transition-colors text-sm ${
                !currentCategory
                  ? "bg-nfw-blackberry text-nfw-dove"
                  : "bg-white text-nfw-blackberry border border-nfw-blackberry/20 hover:bg-nfw-lilac/20"
              }`}
            >
              All Articles ({articles.length})
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryFilter(category.slug)}
                className={`px-4 py-2 whitespace-nowrap font-semibold transition-colors text-sm ${
                  currentCategory === category.slug
                    ? "bg-nfw-blackberry text-nfw-dove"
                    : "bg-white text-nfw-blackberry border border-nfw-blackberry/20 hover:bg-nfw-lilac/20"
                }`}
              >
                {category.icon} {category.name} ({category.article_count})
              </button>
            ))}
          </div>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-nfw-blackberry/60 text-lg">
              {currentSearch || currentCategory
                ? "No articles found matching your criteria."
                : "No articles published yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <div
                key={article.id}
                className="group bg-white border border-nfw-blackberry/10 overflow-hidden"
              >
                <Link href={`/articles/${article.slug}`}>
                  {article.featured_image_url ? (
                    <div className="relative h-48 bg-nfw-lilac/20 overflow-hidden">
                      <Image
                        src={article.featured_image_url}
                        alt={article.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="relative h-48 bg-nfw-lilac/20 flex items-center justify-center">
                      <span className="text-5xl opacity-30 font-serif">A</span>
                    </div>
                  )}
                </Link>

                <div className="p-5">
                  {article.category && (
                    <span
                      className="inline-block text-xs px-2.5 py-1 mb-3 font-semibold"
                      style={{
                        backgroundColor: `${article.category.color}20`,
                        color: article.category.color ?? undefined,
                      }}
                    >
                      {article.category.icon} {article.category.name}
                    </span>
                  )}

                  <Link href={`/articles/${article.slug}`}>
                    <h3 className="text-lg font-bold text-nfw-blackberry mb-2 group-hover:text-nfw-blackberry/75 transition-colors line-clamp-2 font-serif">
                      {article.title}
                    </h3>
                  </Link>

                  {article.excerpt && (
                    <p className="text-nfw-blackberry/60 text-sm mb-4 line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm pt-4 border-t border-nfw-blackberry/10">
                    <div className="flex items-center gap-2 text-nfw-blackberry/50">
                      <span>{article.show_as_nfw_team ? "NFW Team" : (article.author?.full_name || "NFW Team")}</span>
                      <span>•</span>
                      <span>
                        {new Date(
                          article.published_at || article.created_at,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleLike(article.id, article.user_has_liked || false);
                      }}
                      disabled={likingArticleId === article.id}
                      className={`flex items-center gap-2 px-4 py-2 font-medium transition-all disabled:opacity-50 ${
                        article.user_has_liked
                          ?                           "bg-nfw-wisteria/30 text-nfw-blackberry hover:bg-nfw-wisteria/50"
                          : "bg-nfw-lilac/20 text-nfw-blackberry/60 hover:bg-nfw-lilac/40 hover:text-nfw-blackberry"
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 transition-all ${
                          article.user_has_liked
                            ? "fill-nfw-blackberry stroke-nfw-blackberry"
                            : "stroke-nfw-blackberry/60"
                        }`}
                      />
                      <span className="text-sm">{article.like_count}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
