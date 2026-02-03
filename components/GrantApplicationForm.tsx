'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface GrantCycle {
  id: string
  cycle_name: string
  description: string
  end_date: string
  available_funds: number
}

interface UserProfile {
  full_name: string
  email: string
  city: string
  state: string
}

const GRANT_CATEGORIES = [
  { value: 'childcare_support', label: 'Childcare Support' },
  { value: 'emergency_care', label: 'Emergency Care' },
  { value: 'education_essentials', label: 'Education & Essentials' },
  { value: 'medical_medicine', label: 'Medical & Medicine' },
  { value: 'rent_transportation', label: 'Rent & Transportation' },
  { value: 'school_supplies', label: 'School Supplies' },
  { value: 'food_essentials', label: 'Food Essentials' },
  { value: 'car_repair', label: 'Car Repair' },
  { value: 'small_business_starter', label: 'Small Business Starter' },
  { value: 'other', label: 'Other' },
]

export default function GrantApplicationForm({ 
  userId, 
  cycles,
  userProfile 
}: { 
  userId: string
  cycles: GrantCycle[]
  userProfile: UserProfile | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadingDocs, setUploadingDocs] = useState(false)

  const [formData, setFormData] = useState({
    cycle_id: cycles[0]?.id || '',
    category: '',
    title: '',
    description: '',
    amount_requested: '',
  })

  const [documents, setDocuments] = useState<File[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate form
      if (!formData.cycle_id || !formData.category || !formData.title || 
          !formData.description || !formData.amount_requested) {
        throw new Error('Please fill in all required fields')
      }

      const amount = parseFloat(formData.amount_requested)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount')
      }

      // Create grant application
      const response = await fetch('/api/grants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          user_id: userId,
          amount_requested: amount,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const grantId = data.grantId

      // Upload documents if any
      if (documents.length > 0) {
        setUploadingDocs(true)
        await uploadDocuments(grantId)
      }

      // Redirect to success page
      router.push(`/grants/application-success?id=${grantId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to submit application')
      setLoading(false)
      setUploadingDocs(false)
    }
  }

  const uploadDocuments = async (grantId: string) => {
    for (const file of documents) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('grantId', grantId)

      await fetch('/api/grants/upload-document', {
        method: 'POST',
        body: formData,
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Add new files to existing documents array
      const newFiles = Array.from(e.target.files)
      setDocuments(prev => [...prev, ...newFiles])
      // Clear the input so the same file can be selected again if needed
      e.target.value = ''
    }
  }

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
      {/* Grant Cycle Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Grant Cycle *
        </label>
        <select
          value={formData.cycle_id}
          onChange={(e) => setFormData({ ...formData, cycle_id: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.cycle_name} (Deadline: {new Date(cycle.end_date).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      {/* Category Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Grant Category *
        </label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select a category...</option>
          {GRANT_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Grant Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Car Repair for Work Transportation"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Explain your need and how this grant will help you..."
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Be specific about your situation and how the funds will be used.
        </p>
      </div>

      {/* Amount Requested */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Amount Requested *
        </label>
        <div className="relative">
          <span className="absolute left-4 top-2 text-gray-500">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.amount_requested}
            onChange={(e) => setFormData({ ...formData, amount_requested: e.target.value })}
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      {/* Document Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Supporting Documents (Optional)
        </label>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-sm text-gray-500 mt-1">
          Upload receipts, quotes, or other supporting documents (PDF, JPG, PNG, DOC). You can select multiple files at once or add more files separately.
        </p>
        
        {/* Display selected documents with remove option */}
        {documents.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Selected files ({documents.length}):
            </p>
            {documents.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded border border-gray-200"
              >
                <span className="text-sm text-gray-700 truncate flex-1">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeDocument(index)}
                  className="ml-2 text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading || uploadingDocs}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {uploadingDocs ? 'Uploading Documents...' : loading ? 'Submitting...' : 'Submit Application'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/grants/my-applications')}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      <p className="text-sm text-gray-500 mt-4">
        * Required fields. Your application will be reviewed by our team.
      </p>
    </form>
  )
}