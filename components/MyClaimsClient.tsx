'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'

type ClaimWithItem = {
  id: string
  item_id: string
  member_id: string
  claimed_at: string
  shipping_address: {
    full_name: string
    address_line1: string
    address_line2?: string
    city: string
    state: string
    zip: string
    phone: string
  }
  selected_variant: {
    size?: string
    color?: string
    [key: string]: string | undefined
  } | null
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  tracking_number: string | null
  notes: string | null
  shipped_at: string | null
  delivered_at: string | null
  item: {
    id: string
    name: string
    description: string | null
    image_url: string | null
    category: { name: string } | null
  }
}

const STATUS_INFO = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '⏳',
    description: 'Your claim is being processed'
  },
  processing: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '📦',
    description: 'Your item is being prepared for shipment'
  },
  shipped: {
    label: 'Shipped',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '🚚',
    description: 'Your item is on its way'
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '✅',
    description: 'Your item has been delivered'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '❌',
    description: 'This claim was cancelled'
  }
}

export default function MyClaimsClient({ 
  claims, 
  userName 
}: { 
  claims: ClaimWithItem[]
  userName: string 
}) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithItem | null>(null)

  // Filter claims by status
  const filteredClaims = useMemo(() => {
    if (!selectedStatus) return claims
    return claims.filter(claim => claim.status === selectedStatus)
  }, [claims, selectedStatus])

  // Count claims by status
  const statusCounts = useMemo(() => {
    return Object.keys(STATUS_INFO).reduce((acc, status) => {
      acc[status] = claims.filter(c => c.status === status).length
      return acc
    }, {} as Record<string, number>)
  }, [claims])

  if (claims.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-2xl font-bold mb-2">No Claims Yet</h2>
        <p className="text-gray-600 mb-6">
          You haven't claimed any items from the Zero Dollar Store yet.
        </p>
        <a
          href="/store"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
        >
          Browse Available Items
        </a>
      </div>
    )
  }

  return (
    <div>
      {/* Status Filter Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedStatus(null)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium ${
              selectedStatus === null
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border'
            }`}
          >
            All Claims ({claims.length})
          </button>
          {Object.entries(STATUS_INFO).map(([status, info]) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium ${
                selectedStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border'
              }`}
            >
              {info.icon} {info.label} ({statusCounts[status] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-600">No claims with this status.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map(claim => {
            const statusInfo = STATUS_INFO[claim.status]
            return (
              <div
                key={claim.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex gap-6">
                    {/* Item Image */}
                    {claim.item.image_url && (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={claim.item.image_url}
                          alt={claim.item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    {/* Claim Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">
                            {claim.item.name}
                          </h3>
                          {claim.item.category && (
                            <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                              {claim.item.category.name}
                            </span>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium border ${statusInfo.color}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>

                      {claim.item.description && (
                        <p className="text-gray-600 text-sm mb-3">
                          {claim.item.description}
                        </p>
                      )}

                      {/* Variant Info */}
                      {claim.selected_variant && (
                        <div className="mb-3">
                          <span className="text-sm text-gray-600">
                            Selected: {Object.entries(claim.selected_variant)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ')}
                          </span>
                        </div>
                      )}

                      {/* Status Description */}
                      <p className="text-sm text-gray-600 mb-3">
                        {statusInfo.description}
                      </p>

                      {/* Tracking Number */}
                      {claim.tracking_number && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <div className="text-sm font-medium text-blue-900 mb-1">
                            Tracking Number
                          </div>
                          <div className="font-mono text-blue-700">
                            {claim.tracking_number}
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div>
                          <span className="font-medium">Claimed:</span>{' '}
                          {new Date(claim.claimed_at).toLocaleDateString()}
                        </div>
                        {claim.shipped_at && (
                          <div>
                            <span className="font-medium">Shipped:</span>{' '}
                            {new Date(claim.shipped_at).toLocaleDateString()}
                          </div>
                        )}
                        {claim.delivered_at && (
                          <div>
                            <span className="font-medium">Delivered:</span>{' '}
                            {new Date(claim.delivered_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {/* View Details Button */}
                      <button
                        onClick={() => setSelectedClaim(claim)}
                        className="mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        View Shipping Details →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Claim Details Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold">Claim Details</h2>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Item Info */}
            <div className="mb-6">
              <div className="flex gap-4 items-start">
                {selectedClaim.item.image_url && (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={selectedClaim.item.image_url}
                      alt={selectedClaim.item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {selectedClaim.item.name}
                  </h3>
                  {selectedClaim.item.description && (
                    <p className="text-gray-600 text-sm">
                      {selectedClaim.item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Status</h4>
              <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${STATUS_INFO[selectedClaim.status].color}`}>
                {STATUS_INFO[selectedClaim.status].icon} {STATUS_INFO[selectedClaim.status].label}
              </span>
              <p className="text-sm text-gray-600 mt-2">
                {STATUS_INFO[selectedClaim.status].description}
              </p>
            </div>

            {/* Tracking */}
            {selectedClaim.tracking_number && (
              <div className="mb-6">
                <h4 className="font-semibold mb-2">Tracking Information</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="font-mono text-blue-700 text-lg">
                    {selectedClaim.tracking_number}
                  </div>
                </div>
              </div>
            )}

            {/* Shipping Address */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Shipping Address</h4>
              <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-1">
                <div>{selectedClaim.shipping_address.full_name}</div>
                <div>{selectedClaim.shipping_address.address_line1}</div>
                {selectedClaim.shipping_address.address_line2 && (
                  <div>{selectedClaim.shipping_address.address_line2}</div>
                )}
                <div>
                  {selectedClaim.shipping_address.city}, {selectedClaim.shipping_address.state} {selectedClaim.shipping_address.zip}
                </div>
                <div>Phone: {selectedClaim.shipping_address.phone}</div>
              </div>
            </div>

            {/* Timeline */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Timeline</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="font-medium">Claimed:</span>
                  <span className="text-gray-600">
                    {new Date(selectedClaim.claimed_at).toLocaleString()}
                  </span>
                </div>
                {selectedClaim.shipped_at && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span className="font-medium">Shipped:</span>
                    <span className="text-gray-600">
                      {new Date(selectedClaim.shipped_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedClaim.delivered_at && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="font-medium">Delivered:</span>
                    <span className="text-gray-600">
                      {new Date(selectedClaim.delivered_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedClaim(null)}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}