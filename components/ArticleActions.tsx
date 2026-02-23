'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart } from 'lucide-react'

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
        className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all disabled:opacity-50 ${
          userHasLiked
            ? 'bg-[#d4f1ad] text-[#2d1239] hover:bg-[#d4f1ad]/70'
            : 'bg-[#BCAFCF]/20 text-[#2d1239]/60 hover:bg-[#BCAFCF]/40 hover:text-[#2d1239]'
        }`}
      >
        <Heart
          className={`w-4 h-4 transition-all ${
            userHasLiked ? 'fill-[#2d1239] stroke-[#2d1239]' : 'stroke-[#2d1239]/60'
          }`}
        />
        <span className="text-sm">{likeCount}</span>
      </button>
    </div>
  )
}