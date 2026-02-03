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
    return {
      title: 'Article Not Found'
    }
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

  // Fetch article
  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !article) {
    notFound()
  }

  // Fetch category separately if exists
  let category = null
  if (article.category_id) {
    const { data: categoryData } = await supabase
      .from('article_categories')
      .select('*')
      .eq('id', article.category_id)
      .single()
    category = categoryData
  }

  // Fetch author separately if exists
  let author = null
  if (article.author_id) {
    const { data: authorData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', article.author_id)
      .single()
    author = authorData
  }

  // Check if user has liked
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

  // Fetch related articles (same category)
  const { data: relatedArticles } = await supabase
    .from('articles')
    .select('id, title, slug, featured_image_url, excerpt, published_at')
    .eq('category_id', article.category_id)
    .eq('is_published', true)
    .neq('id', article.id)
    .order('published_at', { ascending: false })
    .limit(3)

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Image */}
      {article.hero_image_url && (
        <div className="relative h-96 w-full">
          <Image
            src={article.hero_image_url}
            alt={article.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <article className="max-w-4xl mx-auto px-8 py-12">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6">
          <a 
            href="/articles" 
            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
          >
            <span>←</span>
            <span>Back to All Articles</span>
          </a>
        </nav>

        {/* Header */}
        <header className="mb-8">
          {category && (
            <span
              className="inline-block text-sm px-3 py-1 rounded mb-4 font-medium"
              style={{
                backgroundColor: `${category.color}20`,
                color: category.color
              }}
            >
              {category.icon} {category.name}
            </span>
          )}
          
          <h1 className="text-5xl font-bold mb-4">{article.title}</h1>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-gray-600">
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
        </header>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Articles */}
        {relatedArticles && relatedArticles.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map(related => (
                <a
                  key={related.id}
                  href={`/articles/${related.slug}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {related.featured_image_url && (
                    <div className="relative h-32 bg-gray-200">
                      <Image
                        src={related.featured_image_url}
                        alt={related.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold mb-2 line-clamp-2 text-gray-900">
                      {related.title}
                    </h3>
                    {related.excerpt && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {related.excerpt}
                      </p>
                    )}
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