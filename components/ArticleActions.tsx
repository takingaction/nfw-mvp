'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ArticleActions({
  articleId,
  likeCount,
  userHasLiked,
  userId
}: {
  articleId: string
  likeCount: number
  userHasLiked: boolean
  userId?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleLike = async () => {
    if (!userId) {
      router.push('/auth/login')
      return
    }

    setLoading(true)

    try {
      if (userHasLiked) {
        await supabase
          .from('article_likes')
          .delete()
          .eq('article_id', articleId)
          .eq('user_id', userId)
      } else {
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
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleLike}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          userHasLiked
            ? 'bg-red-100 text-red-600 hover:bg-red-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } disabled:opacity-50`}
      >
        <span className="text-xl">{userHasLiked ? '❤️' : '🤍'}</span>
        <span>{likeCount}</span>
      </button>
    </div>
  )
}