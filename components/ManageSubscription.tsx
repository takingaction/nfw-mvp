'use client'

import { useState } from 'react'

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
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
        className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Manage Subscription'}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  )
}