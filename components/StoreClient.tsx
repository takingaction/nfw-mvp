'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ClaimItemModal from './ClaimItemModal'

type ItemWithDetails = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  quantity_available: number
  max_claims_per_member: number
  variants: any
  category?: {
    id: string
    name: string
    slug: string
    icon: string | null
  } | null
  user_claim_count?: number
}

type Category = {
  id: string
  name: string
  slug: string
  icon: string | null
  display_order: number
}

export default function StoreClient({
  items,
  categories,
  currentCategory,
  currentSearch,
  userId
}: {
  items: ItemWithDetails[]
  categories: Category[]
  currentCategory?: string
  currentSearch?: string
  userId?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(currentSearch || '')
  const [claimingItem, setClaimingItem] = useState<ItemWithDetails | null>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (searchQuery) {
      params.set('search', searchQuery)
    } else {
      params.delete('search')
    }
    router.push(`/store?${params.toString()}`)
  }

  const handleCategoryFilter = (categorySlug: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (categorySlug) {
      params.set('category', categorySlug)
    } else {
      params.delete('category')
    }
    router.push(`/store?${params.toString()}`)
  }

  const handleClaim = (item: ItemWithDetails) => {
    if (!userId) {
      router.push('/auth/login')
      return
    }

    setClaimingItem(item)
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Zero Dollar Store</h1>
          <p className="text-gray-600 mb-6">
            Browse and claim free items. All items are completely free for NFW members!
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
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
                    router.push('/store')
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
              All Items ({items.length})
            </button>
            {categories.map(category => {
              const categoryItemCount = items.filter(
                item => item.category?.id === category.id
              ).length
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryFilter(category.slug)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium ${
                    currentCategory === category.slug
                      ? 'bg-blue-600 text-white'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {category.icon} {category.name} ({categoryItemCount})
                </button>
              )
            })}
          </div>
        </div>

        {/* Items Grid */}
        {items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-600 text-lg">
              {currentSearch || currentCategory
                ? 'No items found matching your criteria.'
                : 'No items available yet. Check back soon!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => {
              const canClaim = item.quantity_available > 0 && 
                             (item.user_claim_count || 0) < item.max_claims_per_member
              const isOutOfStock = item.quantity_available === 0
              const hasReachedLimit = (item.user_claim_count || 0) >= item.max_claims_per_member

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {item.image_url && (
                    <div className="relative h-48 bg-gray-200">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="p-6">
                    {item.category && (
                      <span className="inline-block text-xs px-2 py-1 rounded mb-2 bg-gray-100 text-gray-700">
                        {item.category.icon} {item.category.name}
                      </span>
                    )}
                    
                    <h2 className="text-xl font-semibold mb-2">{item.name}</h2>
                    
                    {item.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {item.description}
                      </p>
                    )}

                    {/* Variants */}
                    {item.variants && item.variants.length > 0 && (
                      <div className="mb-4 text-sm">
                        {item.variants.map((variant: any, idx: number) => (
                          <div key={idx} className="text-gray-600">
                            <strong>{variant.name}:</strong> {variant.options.join(', ')}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>{item.quantity_available} available</span>
                      {userId && item.user_claim_count! > 0 && (
                        <span className="text-blue-600">
                          You claimed: {item.user_claim_count}
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleClaim(item)}
                      disabled={!canClaim}
                      className={`w-full py-2 rounded-lg font-medium transition-colors ${
                        canClaim
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      } disabled:opacity-50`}
                    >
                      {isOutOfStock
                        ? 'Out of Stock'
                        : hasReachedLimit
                        ? 'Claim Limit Reached'
                        : 'Claim Item'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Claim Modal */}
        {claimingItem && userId && (
          <ClaimItemModal
            item={claimingItem}
            userId={userId}
            onClose={() => setClaimingItem(null)}
          />
        )}
      </div>
    </main>
  )
}