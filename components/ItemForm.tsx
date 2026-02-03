'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ImageUpload from './ImageUpload'

type Category = {
  id: string
  name: string
  slug: string
}

type Variant = {
  name: string
  options: string[]
  optionsInput?: string
}

export default function ItemForm({
  categories,
  item
}: {
  categories: Category[]
  item?: any
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    image_url: item?.image_url || '',
    category_id: item?.category_id || '',
    quantity_available: item?.quantity_available || 0,
    max_claims_per_member: item?.max_claims_per_member || 1,
    is_active: item?.is_active ?? true,
  })

  const [variants, setVariants] = useState<Variant[]>(
    item?.variants?.map((v: any) => ({
      ...v,
      optionsInput: v.options.join(', ')
    })) || []
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Clean up variants before saving (remove optionsInput)
      const cleanVariants = variants.map(({ name, options }) => ({ name, options }))

      const itemData = {
        name: formData.name,
        description: formData.description || null,
        image_url: formData.image_url || null,
        category_id: formData.category_id || null,
        quantity_available: parseInt(formData.quantity_available.toString()),
        max_claims_per_member: parseInt(formData.max_claims_per_member.toString()),
        variants: cleanVariants.length > 0 ? cleanVariants : null,
        is_active: formData.is_active,
      }

      if (item) {
        // Update existing item
        const { error: updateError } = await supabase
          .from('zero_dollar_items')
          .update(itemData)
          .eq('id', item.id)

        if (updateError) throw updateError
      } else {
        // Create new item
        const { error: insertError } = await supabase
          .from('zero_dollar_items')
          .insert(itemData)

        if (insertError) throw insertError
      }

      router.push('/admin/items')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const addVariant = () => {
    setVariants([...variants, { name: '', options: [], optionsInput: '' }])
  }

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
  }

  const updateVariantName = (index: number, name: string) => {
    const updated = [...variants]
    updated[index].name = name
    setVariants(updated)
  }

  const updateVariantOptions = (index: number, input: string) => {
    const updated = [...variants]
    updated[index].optionsInput = input
    updated[index].options = input
      .split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0)
    setVariants(updated)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Item Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Item Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Winter Coat, Laptop, Gift Card"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={4}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Describe the item, its features, and any important details"
        />
      </div>

      {/* Image Upload */}
      <ImageUpload
        label="Item Image"
        currentUrl={formData.image_url}
        onUpload={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
        bucket="store-items"
      />

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category *
        </label>
        <select
          required
          value={formData.category_id}
          onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a category</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Inventory Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity Available *
          </label>
          <input
            type="number"
            required
            min="0"
            value={formData.quantity_available}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity_available: parseInt(e.target.value) || 0 }))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">Total items in stock</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Claims Per Member *
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.max_claims_per_member}
            onChange={(e) => setFormData(prev => ({ ...prev, max_claims_per_member: parseInt(e.target.value) || 1 }))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">How many each member can claim</p>
        </div>
      </div>

      {/* Variants */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Variants (Optional)</h3>
            <p className="text-sm text-gray-500">Add size, color, or other options</p>
          </div>
          <button
            type="button"
            onClick={addVariant}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm"
          >
            + Add Variant
          </button>
        </div>

        {variants.map((variant, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variant Name
                  </label>
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) => updateVariantName(index, e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Size, Color, Style"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={variant.optionsInput || ''}
                    onChange={(e) => updateVariantOptions(index, e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Small, Medium, Large, X-Large"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate each option with a comma (e.g., Small, Medium, Large)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeVariant(index)}
                className="text-red-600 hover:text-red-800 font-medium text-sm mt-6"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {variants.length === 0 && (
          <p className="text-gray-500 text-sm italic">
            No variants added. Click "Add Variant" to add size, color, or other options.
          </p>
        )}
      </div>

      {/* Active Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
        />
        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
          Active (visible to members in the store)
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-6 border-t">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {loading ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/items')}
          className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}