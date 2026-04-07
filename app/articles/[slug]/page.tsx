import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ArticleActions from "@/components/ArticleActions";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("articles")
    .select("title, excerpt, meta_title, meta_description, featured_image_url")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!article) {
    return { title: "Article Not Found" };
  }

  return {
    title: article.meta_title || article.title,
    description: article.meta_description || article.excerpt || "",
    openGraph: {
      title: article.meta_title || article.title,
      description: article.meta_description || article.excerpt || "",
      images: article.featured_image_url ? [article.featured_image_url] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: article.meta_title || article.title,
      description: article.meta_description || article.excerpt || "",
      images: article.featured_image_url ? [article.featured_image_url] : [],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: article, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !article) {
    notFound();
  }

  let category = null;
  if (article.category_id) {
    const { data: categoryData } = await supabase
      .from("article_categories")
      .select("*")
      .eq("id", article.category_id)
      .single();
    category = categoryData;
  }

  let author = null;
  if (article.author_id) {
    const { data: authorData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", article.author_id)
      .single();
    author = authorData;
  }

  let userHasLiked = false;
  if (user) {
    const { data: like } = await supabase
      .from("article_likes")
      .select("id")
      .eq("article_id", article.id)
      .eq("user_id", user.id)
      .single();
    userHasLiked = !!like;
  }

  // Increment view count (fire and forget)
  supabase
    .from("articles")
    .update({ view_count: article.view_count + 1 })
    .eq("id", article.id)
    .then();

  const { data: relatedArticles } = await supabase
    .from("articles")
    .select("id, title, slug, featured_image_url, excerpt, published_at")
    .eq("category_id", article.category_id)
    .eq("is_published", true)
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(3);

  return (
    <main className="min-h-screen bg-nfw-dove">
      <article className="max-w-4xl mx-auto px-8 py-12">
        {article.hero_image_url && (
          <div className="relative h-80 w-full border border-nfw-blackberry/10 mb-8">
            <Image
              src={article.hero_image_url}
              alt={article.title}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
              priority
            />
          </div>
        )}

        <nav className="mb-6">
          <Link
            href="/articles"
            className="text-nfw-blackberry/60 hover:text-nfw-blackberry font-medium flex items-center gap-2 transition-colors w-fit"
          >
            Back to All Articles
          </Link>
        </nav>

        <header className="mb-8">
          {category && (
            <span className="inline-block text-sm px-3 py-1 mb-4 font-medium bg-nfw-lilac/20 text-nfw-blackberry">
              {category.icon} {category.name}
            </span>
          )}

          <h1 className="font-serif text-4xl lg:text-6xl text-nfw-blackberry mb-4 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 text-nfw-blackberry/50 text-sm">
              <span>By {article.show_as_nfw_team ? "NFW Team" : (author?.full_name || "NFW Team")}</span>
              <span>•</span>
              <span>
                {new Date(
                  article.published_at || article.created_at,
                ).toLocaleDateString()}
              </span>
              <span>•</span>
              <span>{article.view_count} views</span>
            </div>

            <ArticleActions
              articleId={article.id}
              likeCount={article.like_count}
              userHasLiked={userHasLiked}
              userId={user?.id}
            />
          </div>

          <div className="mt-6 border-t border-nfw-blackberry/10" />
        </header>

        <div className="mb-8">
          <div
            className="prose prose-lg max-w-none
              prose-headings:text-nfw-blackberry prose-headings:font-bold
              prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
              prose-p:text-nfw-blackberry/80 prose-p:leading-relaxed
              prose-a:text-nfw-blackberry prose-a:underline prose-a:underline-offset-2
              hover:prose-a:text-nfw-blackberry/70
              prose-strong:text-nfw-blackberry
              prose-em:text-nfw-blackberry/80
              prose-blockquote:border-l-4 prose-blockquote:border-nfw-lilac
              prose-blockquote:text-nfw-blackberry/60 prose-blockquote:not-italic
              prose-blockquote:bg-nfw-lilac/10 prose-blockquote:py-1 prose-blockquote:pr-4
              prose-code:text-nfw-blackberry prose-code:bg-nfw-lilac/20
              prose-code:px-1.5 prose-code:py-0.5
              prose-code:text-sm prose-code:font-mono
              prose-pre:bg-nfw-blackberry prose-pre:text-nfw-dove
              prose-hr:border-nfw-blackberry/10
              prose-ul:text-nfw-blackberry/80 prose-ol:text-nfw-blackberry/80
              prose-li:text-nfw-blackberry/80
              prose-img:border prose-img:border-nfw-blackberry/10
              prose-table:text-nfw-blackberry/80
              prose-th:text-nfw-blackberry prose-th:bg-nfw-lilac/20
              prose-td:border-nfw-blackberry/10"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>

        {article.tags && article.tags.length > 0 && (
          <div className="mb-8 pt-6 border-t border-nfw-blackberry/10">
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="bg-nfw-lilac/20 text-nfw-blackberry text-sm px-3 py-1 font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {relatedArticles && relatedArticles.length > 0 && (
          <div className="mt-12 pt-8 border-t border-nfw-blackberry/10">
            <h2 className="font-serif text-4xl lg:text-6xl leading-[1.1] text-nfw-blackberry mb-6">
              Related Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <a
                  key={related.id}
                  href={`/articles/${related.slug}`}
                  className="bg-white border border-nfw-blackberry/10 overflow-hidden hover:border-nfw-lilac transition-all group"
                >
                  {related.featured_image_url && (
                    <div className="relative h-32 bg-nfw-dove">
                      <Image
                        src={related.featured_image_url}
                        alt={related.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold mb-2 line-clamp-2 text-nfw-blackberry">
                      {related.title}
                    </h3>
                    {related.excerpt && (
                      <p className="text-sm text-nfw-blackberry/50 line-clamp-2">
                        {related.excerpt}
                      </p>
                    )}
                    <p className="text-xs text-nfw-blackberry/40 mt-2">
                      {new Date(related.published_at).toLocaleDateString()}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </article>
    </main>
  );
}
