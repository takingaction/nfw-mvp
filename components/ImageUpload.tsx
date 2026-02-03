'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function ImageUpload({
  label,
  currentUrl,
  onUpload,
  bucket = 'article-images'
}: {
  label: string
  currentUrl?: string
  onUpload: (url: string) => void
  bucket?: 'article-images' | 'store-items'
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null)
      setUploading(true)

      if (!e.target.files || e.target.files.length === 0) {
        return
      }

      const file = e.target.files[0]

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      onUpload(publicUrl)
    } catch (err: any) {
      setError(err.message || 'Error uploading image')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      {currentUrl && (
        <div className="mb-4 relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
          <Image
            src={currentUrl}
            alt="Preview"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="flex items-center gap-4">
        <label className="cursor-pointer bg-white border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 font-medium text-sm">
          {uploading ? 'Uploading...' : 'Choose Image'}
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>

        {currentUrl && (
          <button
            type="button"
            onClick={() => onUpload('')}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Remove
          </button>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}

      <p className="text-sm text-gray-500 mt-2">
        Recommended: JPG, PNG, or WebP. Max 5MB.
      </p>
    </div>
  )
}