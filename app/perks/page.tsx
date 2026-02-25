'use client'

import { useState, useEffect } from 'react'
import { Gift, Loader2, AlertTriangle } from 'lucide-react'
import PerksSearch from '@/components/perks/PerksSearch'
import OfferCard from '@/components/perks/OfferCard'

export const metadata = {
  title: 'Perks & Discounts',
  description: '1,000+ member perks and discounts for everyday savings. Exclusive deals for NFW members.',
  openGraph: {
    title: 'Perks & Discounts | National Fund for Women',
    description: '1,000+ member perks and discounts for everyday savings.',
    url: 'https://nationalfundforwomen.org/perks',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default function PerksPage() {
  const [offers, setOffers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInfo, setSearchInfo] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [currentSearchParams, setCurrentSearchParams] = useState<any>({})

  useEffect(() => {
    fetchCategories()
    fetchOffers({})
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/access-perks/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }

  // Deduplicate by offer_group_key
  const deduplicateOffers = (offers: any[]) => {
    const seen = new Set<number>()
    const uniqueOffers: any[] = []
    
    for (const offer of offers) {
      const groupKey = offer.offer_group_key
      
      if (!groupKey) {
        uniqueOffers.push(offer)
        continue
      }
      
      if (!seen.has(groupKey)) {
        seen.add(groupKey)
        uniqueOffers.push(offer)
      }
    }
    
    return uniqueOffers
  }

  const fetchOffers = async (params: any) => {
    setLoading(true)
    setError(null)
    
    try {
      const isSearching = params.query || params.category_key
      
      // Fetch appropriate amount based on whether we're searching
      const queryParams = new URLSearchParams({
        ...params,
        per_page: isSearching ? '100' : '12', // When browsing, just get 12 per page
        aggregations: 'categories,stores'
      })

      const response = await fetch(`/api/access-perks/offers/search?${queryParams.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 503 || errorData.error?.includes('503')) {
          throw new Error('SERVICE_UNAVAILABLE')
        }
        
        throw new Error(errorData.error || 'Failed to fetch offers')
      }

      const data = await response.json()
      
      if (data.message === 'No offers found.') {
        setOffers([])
        setSearchInfo({ total_results: 0, total_pages: 0 })
      } else {
        const allOffers = data.offers || []
        
        if (isSearching) {
          // When searching, deduplicate the results
          const uniqueOffers = deduplicateOffers(allOffers)
          const displayOffers = uniqueOffers.slice(0, 12)
          
          setOffers(displayOffers)
          
          const totalUnique = uniqueOffers.length
          const totalPages = Math.ceil(totalUnique / 12)
          
          setSearchInfo({
            total_results: totalUnique,
            current_page: params.page || 1,
            total_pages: totalPages,
            results_per_page: 12
          })
        } else {
          // When browsing (no search), use API pagination directly
          setOffers(allOffers)
          setSearchInfo(data.info || {})
        }
      }
    } catch (err: any) {
      console.error('Fetch offers error:', err)
      setError(err.message || 'Failed to load offers')
      setOffers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (params: any) => {
    setCurrentSearchParams(params)
    setCurrentPage(1)
    fetchOffers({ ...params, page: 1 })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchOffers({ ...currentSearchParams, page })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Lean Header */}
      <div className="bg-white pt-8 pb-6 border-b border-[#2d1239]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2d1239] mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Member Perks
          </h2>
          <p className="text-[#2d1239]/60">
            Exclusive discounts and offers for NFW members.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="bg-[#f8f7fa] rounded-xl p-4 mb-6">
          <PerksSearch onSearch={handleSearch} categories={categories} />
        </div>

        {/* Results Info */}
        {searchInfo && !loading && !error && (
          <div className="mb-4 text-sm text-[#2d1239]/50">
            {searchInfo.total_results > 0 ? (
              <span>
                Showing {offers.length} of {searchInfo.total_results} offers
                {searchInfo.total_pages > 1 && ` • Page ${currentPage} of ${searchInfo.total_pages}`}
              </span>
            ) : (
              <span>No offers found. Try adjusting your search filters.</span>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#BCAFCF]" />
            <span className="ml-3 text-[#2d1239]/60">Loading offers...</span>
          </div>
        )}

        {/* Error State - Service Unavailable */}
        {error === 'SERVICE_UNAVAILABLE' && !loading && (
          <div className="bg-[#fdf493]/20 border border-[#fdf493] rounded-xl p-6 mt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#2d1239] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-[#2d1239] mb-1">
                  Service Temporarily Unavailable
                </h3>
                <p className="text-[#2d1239]/70 text-sm mb-4">
                  The Access Perks service is currently experiencing issues. Please try again shortly.
                </p>
                <button
                  onClick={() => fetchOffers(currentSearchParams)}
                  className="px-4 py-2 bg-[#2d1239] text-white rounded-lg hover:bg-[#2d1239]/90 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error State - Other Errors */}
        {error && error !== 'SERVICE_UNAVAILABLE' && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">
                  Unable to Load Offers
                </h3>
                <p className="text-red-700 text-sm mb-4">{error}</p>
                <button
                  onClick={() => fetchOffers(currentSearchParams)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Offers Grid */}
        {!loading && !error && offers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {offers.map((offer) => (
              <OfferCard key={offer.offer_key} offer={offer} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && searchInfo && searchInfo.total_pages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-[#2d1239]/20 text-[#2d1239] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2d1239]/5 font-medium transition-colors"
            >
              Previous
            </button>
            
            {Array.from({ length: Math.min(5, searchInfo.total_pages) }, (_: unknown, i: number) => {
              let pageNum
              if (searchInfo.total_pages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= searchInfo.total_pages - 2) {
                pageNum = searchInfo.total_pages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-[#2d1239] text-white'
                      : 'border border-[#2d1239]/20 text-[#2d1239] hover:bg-[#2d1239]/5'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === searchInfo.total_pages}
              className="px-4 py-2 border border-[#2d1239]/20 text-[#2d1239] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2d1239]/5 font-medium transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && offers.length === 0 && searchInfo?.total_results === 0 && (
          <div className="text-center py-16">
            <Gift className="w-12 h-12 text-[#BCAFCF] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#2d1239] mb-2">No offers found</h3>
            <p className="text-[#2d1239]/60 mb-6">
              Try adjusting your search filters or browse all offers.
            </p>
            <button
              onClick={() => handleSearch({})}
              className="px-6 py-2.5 bg-[#2d1239] text-white rounded-lg hover:bg-[#2d1239]/90 transition-colors font-medium"
            >
              Browse All Offers
            </button>
          </div>
        )}
      </div>
    </div>
  )
}