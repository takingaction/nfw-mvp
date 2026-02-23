'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function ManageSubscription({ membershipLevel }: { membershipLevel: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleManageSubscription = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/portal', { method: 'POST' })
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || 'Failed to open subscription portal')
      setLoading(false)
    }
  }

  // Only show for paid members
  if (membershipLevel === 'free') {
    return (
      <a
        href="/membership"
        className="inline-block bg-[#2d1239] text-white px-4 py-2 rounded-lg hover:bg-[#2d1239]/90 font-medium transition-colors"
      >
        Upgrade Membership
      </a>
    )
  }

  return (
    <div>
      <button
        onClick={handleManageSubscription}
        disabled={loading}
        className="bg-[#f8f7fa] text-[#2d1239] px-4 py-2 rounded-lg hover:bg-[#BCAFCF]/20 disabled:opacity-50 font-medium transition-colors border border-[#2d1239]/10 flex items-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Loading...' : 'Manage Subscription'}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  )
}