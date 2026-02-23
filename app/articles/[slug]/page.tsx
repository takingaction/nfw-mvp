import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import ArticleActions from '@/components/ArticleActions'
import type { Metadata } from 'next'

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  
  const { data: article } = await supabase
    .from('articles')
    .select('title, excerpt, meta_title, meta_description, featured_image_url')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!article) {
    return { title: 'Article Not Found' }
  }

  return {
    title: article.meta_title || article.title,
    description: article.meta_description || article.excerpt || '',
    openGraph: {
      title: article.meta_title || article.title,
      description: article.meta_description || article.excerpt || '',
      images: article.featured_image_url ? [article.featured_image_url] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.meta_title || article.title,
      description: article.meta_description || article.excerpt || '',
      images: article.featured_image_url ? [article.featured_image_url] : [],
    }
  }
}

export default async function ArticlePage({ 
  params 
}: { 
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !article) {
    notFound()
  }

  let category = null
  if (article.category_id) {
    const { data: categoryData } = await supabase
      .from('article_categories')
      .select('*')
      .eq('id', article.category_id)
      .single()
    category = categoryData
  }

  let author = null
  if (article.author_id) {
    const { data: authorData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', article.author_id)
      .single()
    author = authorData
  }

  let userHasLiked = false
  if (user) {
    const { data: like } = await supabase
      .from('article_likes')
      .select('id')
      .eq('article_id', article.id)
      .eq('user_id', user.id)
      .single()
    userHasLiked = !!like
  }

  // Increment view count (fire and forget)
  supabase
    .from('articles')
    .update({ view_count: article.view_count + 1 })
    .eq('id', article.id)
    .then()

  const { data: relatedArticles } = await supabase
    .from('articles')
    .select('id, title, slug, featured_image_url, excerpt, published_at')
    .eq('category_id', article.category_id)
    .eq('is_published', true)
    .neq('id', article.id)
    .order('published_at', { ascending: false })
    .limit(3)

  return (
    <main className="min-h-screen bg-[#f8f7fa]">
      <article className="max-w-4xl mx-auto px-8 py-12">

        {/* Hero Image - constrained to article body width */}
        {article.hero_image_url && (
          <div className="relative h-80 w-full rounded-xl overflow-hidden mb-8">
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

        {/* Breadcrumb Navigation */}
        <nav className="mb-6">
          <a 
            href="/articles" 
            className="text-[#2d1239]/60 hover:text-[#2d1239] font-medium flex items-center gap-2 transition-colors w-fit"
          >
            <span>←</span>
            <span>Back to All Articles</span>
          </a>
        </nav>

        {/* Header */}
        <header className="mb-8">
          {/* Category Tag */}
          {category && (
            <span className="inline-block text-sm px-3 py-1 rounded-full mb-4 font-medium bg-[#BCAFCF]/20 text-[#2d1239]">
              {category.icon} {category.name}
            </span>
          )}

          {/* Title */}
          <h1
            className="text-4xl sm:text-5xl font-bold mb-4 text-[#2d1239]"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            {article.title}
          </h1>

          {/* Meta row */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 text-[#2d1239]/50 text-sm">
              <span>By {author?.full_name || 'NFW Team'}</span>
              <span>•</span>
              <span>
                {new Date(article.published_at || article.created_at).toLocaleDateString()}
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

          {/* Divider */}
          <div className="mt-6 border-t border-[#2d1239]/10" />
        </header>

        {/* Article Content */}
        <div className="mb-8">
          <div
            className="prose prose-lg max-w-none
              prose-headings:text-[#2d1239] prose-headings:font-bold
              prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
              prose-p:text-[#2d1239]/80 prose-p:leading-relaxed
              prose-a:text-[#2d1239] prose-a:underline prose-a:underline-offset-2
              hover:prose-a:text-[#2d1239]/70
              prose-strong:text-[#2d1239]
              prose-em:text-[#2d1239]/80
              prose-blockquote:border-l-4 prose-blockquote:border-[#BCAFCF]
              prose-blockquote:text-[#2d1239]/60 prose-blockquote:not-italic
              prose-blockquote:bg-[#BCAFCF]/10 prose-blockquote:rounded-r-lg
              prose-blockquote:py-1 prose-blockquote:pr-4
              prose-code:text-[#2d1239] prose-code:bg-[#BCAFCF]/20
              prose-code:rounded prose-code:px-1.5 prose-code:py-0.5
              prose-code:text-sm prose-code:font-mono
              prose-pre:bg-[#2d1239] prose-pre:text-[#f8f7fa]
              prose-hr:border-[#2d1239]/10
              prose-ul:text-[#2d1239]/80 prose-ol:text-[#2d1239]/80
              prose-li:text-[#2d1239]/80
              prose-img:rounded-xl prose-img:shadow-sm
              prose-table:text-[#2d1239]/80
              prose-th:text-[#2d1239] prose-th:bg-[#BCAFCF]/20
              prose-td:border-[#2d1239]/10"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mb-8 pt-6 border-t border-[#2d1239]/10">
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="bg-[#BCAFCF]/20 text-[#2d1239] text-sm px-3 py-1 rounded-full font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Articles */}
        {relatedArticles && relatedArticles.length > 0 && (
          <div className="mt-12 pt-8 border-t border-[#2d1239]/10">
            <h2
              className="text-2xl font-bold mb-6 text-[#2d1239]"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Related Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map(related => (
                <a
                  key={related.id}
                  href={`/articles/${related.slug}`}
                  className="bg-white rounded-xl border border-[#2d1239]/10 overflow-hidden hover:border-[#BCAFCF] hover:shadow-md transition-all group"
                >
                  {related.featured_image_url && (
                    <div className="relative h-32 bg-[#f8f7fa]">
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
                    <h3 className="font-semibold mb-2 line-clamp-2 text-[#2d1239]">
                      {related.title}
                    </h3>
                    {related.excerpt && (
                      <p className="text-sm text-[#2d1239]/50 line-clamp-2">
                        {related.excerpt}
                      </p>
                    )}
                    <p className="text-xs text-[#2d1239]/40 mt-2">
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
  )
}