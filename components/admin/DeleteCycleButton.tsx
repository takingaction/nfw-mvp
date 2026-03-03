'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DeleteCycleButton({
  cycleId,
  cycleName,
  applicationCount,
}: {
  cycleId: string
  cycleName: string
  applicationCount: number
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (applicationCount > 0) {
      alert(`Cannot delete "${cycleName}" — it has ${applicationCount} application${applicationCount !== 1 ? 's' : ''}. Remove all applications first.`)
      return
    }

    if (!confirm(`Are you sure you want to permanently delete "${cycleName}"? This cannot be undone.`)) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/grants/delete-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      router.refresh()
    } catch (err: any) {
      alert(err.message)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading || applicationCount > 0}
      title={applicationCount > 0 ? `Cannot delete — ${applicationCount} application${applicationCount !== 1 ? 's' : ''} exist` : 'Delete cycle'}
      className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold text-sm hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      Delete
    </button>
  )
}