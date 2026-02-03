'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArticleWithDetails, ArticleCategory } from '@/types/articles'
import { createClient } from '@/lib/supabase/client'

export default function ArticlesClient({
  articles,
  categories,
  currentCategory,
  currentSearch,
  userId
}: {
  articles: ArticleWithDetails[]
  categories: ArticleCategory[]
  currentCategory?: string
  currentSearch?: string
  userId?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(currentSearch || '')
  const [likingArticleId, setLikingArticleId] = useState<string | null>(null)
  const supabase = createClient()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (searchQuery) {
      params.set('search', searchQuery)
    } else {
      params.delete('search')
    }
    router.push(`/articles?${params.toString()}`)
  }

  const handleCategoryFilter = (categorySlug: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (categorySlug) {
      params.set('category', categorySlug)
    } else {
      params.delete('category')
    }
    router.push(`/articles?${params.toString()}`)
  }

  const handleLike = async (articleId: string, currentlyLiked: boolean) => {
    if (!userId) {
      router.push('/auth/login')
      return
    }

    setLikingArticleId(articleId)

    try {
      if (currentlyLiked) {
        // Unlike
        await supabase
          .from('article_likes')
          .delete()
          .eq('article_id', articleId)
          .eq('user_id', userId)
      } else {
        // Like
        await supabase
          .from('article_likes')
          .insert({
            article_id: articleId,
            user_id: userId
          })
      }

      router.refresh()
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setLikingArticleId(null)
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Articles & Resources</h1>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Search
              </button>
              {(currentSearch || currentCategory) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    router.push('/articles')
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => handleCategoryFilter(null)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium ${
                !currentCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              All Articles ({articles.length})
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategoryFilter(category.slug)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium ${
                  currentCategory === category.slug
                    ? 'bg-blue-600 text-white'
                    : 'bg-white hover:bg-gray-50'
                }`}
                style={
                  currentCategory === category.slug
                    ? {}
                    : { borderLeft: `3px solid ${category.color}` }
                }
              >
                {category.icon} {category.name} ({category.article_count})
              </button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        {articles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 text-lg">
              {currentSearch || currentCategory
                ? 'No articles found matching your criteria.'
                : 'No articles published yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(article => (
              <div
                key={article.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
<Link href={`/articles/${article.slug}`}>
  {article.featured_image_url && (
    <div className="relative h-48 bg-gray-200">
      <Image
        src={article.featured_image_url}
        alt={article.title}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover"
      />
    </div>
  )}
</Link>
                
                <div className="p-6">
                  {article.category && (
                    <span
                      className="inline-block text-xs px-2 py-1 rounded mb-2 font-medium"
                      style={{
                        backgroundColor: `${article.category.color}20`,
                        color: article.category.color
                      }}
                    >
                      {article.category.icon} {article.category.name}
                    </span>
                  )}
                  
                  <Link href={`/articles/${article.slug}`}>
                    <h2 className="text-xl font-semibold mb-2 hover:text-blue-600">
                      {article.title}
                    </h2>
                  </Link>
                  
                  {article.excerpt && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>{article.author?.full_name || 'NFW Team'}</span>
                      <span>•</span>
                      <span>
                        {new Date(article.published_at || article.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleLike(article.id, article.user_has_liked || false)}
                      disabled={likingArticleId === article.id}
                      className={`flex items-center gap-1 ${
                        article.user_has_liked
                          ? 'text-red-600'
                          : 'text-gray-400 hover:text-red-600'
                      } disabled:opacity-50`}
                    >
                      <span className="text-lg">
                        {article.user_has_liked ? '❤️' : '🤍'}
                      </span>
                      <span className="text-xs">{article.like_count}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}