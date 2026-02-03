'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Variant = {
  name: string
  options: string[]
}

export default function ClaimItemModal({
  item,
  userId,
  onClose
}: {
  item: {
    id: string
    name: string
    variants?: Variant[]
  }
  userId: string
  onClose: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [claiming, setClaiming] = useState(false)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const handleVariantChange = (variantName: string, option: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [variantName]: option
    }))
  }

  const handleClaim = async () => {
    // Validate all variants are selected
    if (item.variants && item.variants.length > 0) {
      const missingVariants = item.variants.filter(v => !selectedVariants[v.name])
      if (missingVariants.length > 0) {
        setError(`Please select: ${missingVariants.map(v => v.name).join(', ')}`)
        return
      }
    }

    setClaiming(true)
    setError(null)

    try {
      // Check if user already claimed this item
      const { data: existingClaim } = await supabase
        .from('zero_dollar_claims')
        .select('id')
        .eq('item_id', item.id)
        .eq('member_id', userId)
        .single()

      if (existingClaim) {
        setError('You have already claimed this item. Check your claims page for status.')
        setClaiming(false)
        return
      }

      // Get user's profile with address
      const { data: profile } = await supabase
        .from('profiles')
        .select('shipping_address')
        .eq('id', userId)
        .single()

      const { error: claimError } = await supabase
        .from('zero_dollar_claims')
        .insert({
          item_id: item.id,
          member_id: userId,
          status: 'pending',
          shipping_address: profile?.shipping_address || null,
          selected_variants: item.variants && item.variants.length > 0 ? selectedVariants : null
        })

      if (claimError) throw claimError

      router.refresh()
      onClose()
      
      // Show success message
      setTimeout(() => {
        alert('Item claimed successfully! Check your claims page for status.')
      }, 100)
    } catch (err: any) {
      setError(err.message || 'Error claiming item')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Claim Item</h2>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            You're about to claim: <strong>{item.name}</strong>
          </p>

          {/* Variant Selection */}
          {item.variants && item.variants.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 font-medium">Please select your preferences:</p>
              
              {item.variants.map((variant) => (
                <div key={variant.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {variant.name} *
                  </label>
                  <select
                    value={selectedVariants[variant.name] || ''}
                    onChange={(e) => handleVariantChange(variant.name, e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select {variant.name}</option>
                    {variant.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {!item.variants || item.variants.length === 0 && (
            <p className="text-sm text-gray-600">
              Click "Claim Item" to confirm your claim.
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {claiming ? 'Claiming...' : 'Claim Item'}
          </button>
          <button
            onClick={onClose}
            disabled={claiming}
            className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}