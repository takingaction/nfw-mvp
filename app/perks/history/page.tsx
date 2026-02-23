'use client'

import { useState, useEffect } from 'react'
import { 
  Gift, 
  ExternalLink, 
  Phone, 
  Copy, 
  Check,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Filter,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Archive,
  ArchiveRestore
} from 'lucide-react'
import Link from 'next/link'

interface Redemption {
  id: string
  offer_key: string
  offer_title: string
  store_name: string | null
  location_name: string | null
  redeem_type: string
  coupon_code: string | null
  phone_number: string | null
  redemption_url: string | null
  instructions: string | null
  display_message: string | null
  status: 'active' | 'used' | 'expired' | 'archived'
  redeemed_at: string
  expires_at: string | null
}

const ITEMS_PER_PAGE = 10

export default function RedemptionHistoryPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchRedemptions()
  }, [statusFilter, currentPage])

  const fetchRedemptions = async () => {
  try {
    setLoading(true)
    
    const offset = (currentPage - 1) * ITEMS_PER_PAGE
    
    // Build status parameter
    let statusParam = ''
    if (statusFilter === 'archived') {
      // Only show archived
      statusParam = '&status=archived'
    } else if (statusFilter !== 'all') {
      // Show specific status (active, used, expired)
      statusParam = `&status=${statusFilter}`
    } else {
      // "All" means all EXCEPT archived
      statusParam = '&exclude_archived=true'
    }
    
    const url = `/api/access-perks/redemptions?limit=${ITEMS_PER_PAGE}&offset=${offset}${statusParam}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error('Failed to fetch redemptions')
    }

    const data = await response.json()
    setRedemptions(data.redemptions || [])
    setTotalCount(data.total_count || 0)
  } catch (err: any) {
    console.error('Fetch redemptions error:', err)
    setError(err.message || 'Failed to load redemptions')
  } finally {
    setLoading(false)
  }
}

  const updateStatus = async (id: string, newStatus: 'active' | 'used' | 'archived') => {
    try {
      setUpdatingId(id)
      
      console.log('🔄 Updating status:', { id, newStatus })
      
      const response = await fetch(`/api/access-perks/redemptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ API Error:', data)
        throw new Error(data.error || 'Failed to update status')
      }

      console.log('✅ Update successful:', data)

      setRedemptions(prev => 
        prev.map(r => r.id === id ? { ...r, status: newStatus } : r)
      )
    } catch (err: any) {
      console.error('❌ Update status error:', err)
      alert(`Failed to update status: ${err.message}`)
    } finally {
      setUpdatingId(null)
    }
  }

  const toggleUsedStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'used' : 'active'
    updateStatus(id, newStatus as 'active' | 'used')
  }

  const archiveRedemption = (id: string) => {
    updateStatus(id, 'archived')
  }

  const unarchiveRedemption = (id: string) => {
    updateStatus(id, 'active')
  }

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const decodeHtml = (html: string | null) => {
    if (!html) return ''
    if (typeof window === 'undefined') return html
    const textarea = document.createElement('textarea')
    textarea.innerHTML = html
    return textarea.value
  }

  const getRedemptionTypeLabel = (type: string) => {
    switch (type) {
      case 'link': return 'Online'
      case 'instore': return 'In-Store'
      case 'instore_print': return 'Print'
      case 'call': return 'Call'
      default: return type
    }
  }

  const getRedemptionTypeColor = (type: string) => {
    switch (type) {
      case 'link': return 'bg-[#2d1239] text-white'
      case 'instore': return 'bg-[#BCAFCF] text-[#2d1239]'
      case 'instore_print': return 'bg-[#b2d1ee] text-[#2d1239]'
      case 'call': return 'bg-[#d4f1ad] text-[#2d1239]'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-[#d4f1ad]/30 text-[#2d1239] font-medium border border-[#d4f1ad]">Active</span>
      case 'used':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-[#BCAFCF]/20 text-[#2d1239] font-medium border border-[#BCAFCF]">Used</span>
      case 'expired':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-[#f8f7fa] text-[#2d1239]/60 font-medium border border-[#2d1239]/10">Expired</span>
      case 'archived':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium border border-gray-300">Archived</span>
      default:
        return null
    }
  }

  const handleFilterChange = (newFilter: string) => {
    setStatusFilter(newFilter)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-[#2d1239]/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[#2d1239]/60 hover:text-[#2d1239] transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#2d1239]">Redemption History</h1>
              <p className="text-[#2d1239]/60 mt-1">View and manage your redeemed offers</p>
            </div>
          </div>
        </div>
      </div>

          {/* Filters */}
          <div className="bg-[#f8f7fa] border-b border-[#2d1239]/10">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                  <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-[#2d1239]/60" />
                      <span className="text-sm font-medium text-[#2d1239]/60">Filter:</span>
                      <div className="flex gap-2 flex-wrap">
                          {/* Primary Status Filters */}
                          {['all', 'active', 'used', 'expired'].map((status) => (
                              <button
                                  key={status}
                                  onClick={() => handleFilterChange(status)}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                                          ? 'bg-[#2d1239] text-white'
                                          : 'bg-white text-[#2d1239] hover:bg-[#2d1239]/5 border border-[#2d1239]/10'
                                      }`}
                              >
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                          ))}
        
        {/* Archived Filter - Different Style */}
        <button
          onClick={() => handleFilterChange('archived')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'archived'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Archived
        </button>
      </div>
    </div>
  </div>
</div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#BCAFCF]" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-semibold">Error Loading Redemptions</h3>
            </div>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        ) : redemptions.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-[#2d1239]/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#2d1239] mb-2">No Redemptions Found</h3>
            <p className="text-[#2d1239]/60 mb-6">
              {statusFilter === 'all' 
                ? "You haven't redeemed any offers yet"
                : `No ${statusFilter} redemptions found`}
            </p>
            <Link
              href="/perks"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2d1239] text-white rounded-xl hover:bg-[#2d1239]/90 transition-colors font-medium"
            >
              Browse Perks
            </Link>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-4">
              <p className="text-sm text-[#2d1239]/60">
                Showing {startItem}-{endItem} of {totalCount} redemption{totalCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Redemptions List */}
            <div className="space-y-4 mb-6">
              {redemptions.map((redemption) => (
                <div
                  key={redemption.id}
                  className="bg-white rounded-xl border border-[#2d1239]/10 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-[#f8f7fa] border border-[#2d1239]/10 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-[#2d1239]" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          {redemption.store_name && (
                            <p 
                              className="text-sm font-semibold text-[#2d1239] mb-0.5 [&_sup]:text-[0.6em] [&_sup]:align-super"
                              dangerouslySetInnerHTML={{ __html: decodeHtml(redemption.store_name) }}
                            />
                          )}
                          <h3 
                            className="text-base font-medium text-[#2d1239]/80 [&_sup]:text-[0.6em] [&_sup]:align-super"
                            dangerouslySetInnerHTML={{ __html: decodeHtml(redemption.offer_title) }}
                          />
                          {redemption.location_name && (
                            <p className="text-xs text-[#2d1239]/40 mt-0.5">
                              {redemption.location_name}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(redemption.status)}
                      </div>

                      {/* Type & Date */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${getRedemptionTypeColor(redemption.redeem_type)}`}>
                          {getRedemptionTypeLabel(redemption.redeem_type)}
                        </span>
                        <span className="text-xs text-[#2d1239]/40">
                          Redeemed {formatDate(redemption.redeemed_at)}
                        </span>
                        {redemption.expires_at && (
                          <span className="text-xs text-[#2d1239]/40">
                            • Expires {formatDate(redemption.expires_at)}
                          </span>
                        )}
                      </div>

                      {/* Instructions */}
                      {redemption.display_message && (
                        <div className="mb-3 p-3 bg-[#f8f7fa] rounded-lg">
                          <p className="text-xs text-[#2d1239]/70">
                            {redemption.display_message}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {/* Toggle Used/Active - Only for active or used */}
                        {(redemption.status === 'active' || redemption.status === 'used') && (
                          <button
                            onClick={() => toggleUsedStatus(redemption.id, redemption.status)}
                            disabled={updatingId === redemption.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium disabled:opacity-50 ${
                              redemption.status === 'active'
                                ? 'bg-[#d4f1ad] text-[#2d1239] hover:bg-[#d4f1ad]/80'
                                : 'bg-[#BCAFCF]/20 text-[#2d1239] hover:bg-[#BCAFCF]/30 border border-[#BCAFCF]'
                            }`}
                          >
                            {updatingId === redemption.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Updating...
                              </>
                            ) : redemption.status === 'active' ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Mark as Used
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3" />
                                Mark as Active
                              </>
                            )}
                          </button>
                        )}

                        {/* Archive/Unarchive Button */}
                        {redemption.status === 'archived' ? (
                          <button
                            onClick={() => unarchiveRedemption(redemption.id)}
                            disabled={updatingId === redemption.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#fdf493]/30 text-[#2d1239] rounded-lg hover:bg-[#fdf493]/50 transition-colors text-xs font-medium disabled:opacity-50 border border-[#fdf493]"
                          >
                            {updatingId === redemption.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <ArchiveRestore className="w-3 h-3" />
                                Unarchive
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => archiveRedemption(redemption.id)}
                            disabled={updatingId === redemption.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium disabled:opacity-50"
                          >
                            {updatingId === redemption.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Archiving...
                              </>
                            ) : (
                              <>
                                <Archive className="w-3 h-3" />
                                Archive
                              </>
                            )}
                          </button>
                        )}

                        {redemption.coupon_code && (
                          <button
                            onClick={() => copyCode(redemption.coupon_code!, redemption.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2d1239] text-white rounded-lg hover:bg-[#2d1239]/90 transition-colors text-xs font-medium"
                          >
                            {copiedId === redemption.id ? (
                              <>
                                <Check className="w-3 h-3" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Code: {redemption.coupon_code}
                              </>
                            )}
                          </button>
                        )}

                        {redemption.phone_number && (
                          <a
                            href={`tel:${redemption.phone_number}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#d4f1ad] text-[#2d1239] rounded-lg hover:bg-[#d4f1ad]/80 transition-colors text-xs font-medium"
                          >
                            <Phone className="w-3 h-3" />
                            {redemption.phone_number}
                          </a>
                        )}

                        {redemption.redemption_url && (
                          <a
                            href={redemption.redemption_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#BCAFCF]/20 text-[#2d1239] rounded-lg hover:bg-[#BCAFCF]/30 transition-colors text-xs font-medium"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open Offer
                          </a>
                        )}

                        <Link
                          href={`/perks/${redemption.offer_key}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f7fa] text-[#2d1239] rounded-lg hover:bg-[#2d1239]/5 transition-colors text-xs font-medium border border-[#2d1239]/10"
                        >
                          View Offer Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#2d1239]/10 pt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#2d1239] rounded-lg hover:bg-[#f8f7fa] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-[#2d1239]/10 font-medium text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#2d1239]/60">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#2d1239] rounded-lg hover:bg-[#f8f7fa] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-[#2d1239]/10 font-medium text-sm"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}