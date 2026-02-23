'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

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
      const newFiles = Array.from(e.target.files)
      setDocuments(prev => [...prev, ...newFiles])
      e.target.value = ''
    }
  }

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#2d1239]/10 p-8">
      {/* Grant Cycle Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#2d1239] mb-2">
          Grant Cycle <span className="text-[#BCAFCF]">*</span>
        </label>
        <select
          value={formData.cycle_id}
          onChange={(e) => setFormData({ ...formData, cycle_id: e.target.value })}
          className="w-full px-4 py-2.5 border border-[#2d1239]/20 rounded-lg text-[#2d1239] bg-white focus:outline-none focus:ring-2 focus:ring-[#BCAFCF] focus:border-transparent transition-all"
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
        <label className="block text-sm font-medium text-[#2d1239] mb-2">
          Grant Category <span className="text-[#BCAFCF]">*</span>
        </label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full px-4 py-2.5 border border-[#2d1239]/20 rounded-lg text-[#2d1239] bg-white focus:outline-none focus:ring-2 focus:ring-[#BCAFCF] focus:border-transparent transition-all"
          required
        >
          <option value="" className="text-[#2d1239]/40">Select a category...</option>
          {GRANT_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#2d1239] mb-2">
          Grant Title <span className="text-[#BCAFCF]">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Car Repair for Work Transportation"
          className="w-full px-4 py-2.5 border border-[#2d1239]/20 rounded-lg text-[#2d1239] placeholder-[#2d1239]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#BCAFCF] focus:border-transparent transition-all"
          required
        />
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#2d1239] mb-2">
          Description <span className="text-[#BCAFCF]">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Explain your need and how this grant will help you..."
          rows={6}
          className="w-full px-4 py-2.5 border border-[#2d1239]/20 rounded-lg text-[#2d1239] placeholder-[#2d1239]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#BCAFCF] focus:border-transparent transition-all resize-none"
          required
        />
        <p className="text-sm text-[#2d1239]/50 mt-1">
          Be specific about your situation and how the funds will be used.
        </p>
      </div>

      {/* Amount Requested */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#2d1239] mb-2">
          Amount Requested <span className="text-[#BCAFCF]">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-2.5 text-[#2d1239]/50">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.amount_requested}
            onChange={(e) => setFormData({ ...formData, amount_requested: e.target.value })}
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-2.5 border border-[#2d1239]/20 rounded-lg text-[#2d1239] placeholder-[#2d1239]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#BCAFCF] focus:border-transparent transition-all"
            required
          />
        </div>
      </div>

      {/* Document Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#2d1239] mb-2">
          Supporting Documents <span className="text-[#2d1239]/50">(Optional)</span>
        </label>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileChange}
          className="w-full px-4 py-2.5 border border-[#2d1239]/20 rounded-lg text-[#2d1239] bg-white focus:outline-none focus:ring-2 focus:ring-[#BCAFCF] focus:border-transparent transition-all file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-[#BCAFCF]/20 file:text-[#2d1239] hover:file:bg-[#BCAFCF]/30"
        />
        <p className="text-sm text-[#2d1239]/50 mt-1">
          Upload receipts, quotes, or other supporting documents (PDF, JPG, PNG, DOC). You can select multiple files at once or add more files separately.
        </p>
        
        {/* Display selected documents with remove option */}
        {documents.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-[#2d1239]">
              Selected files ({documents.length}):
            </p>
            {documents.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between bg-[#f8f7fa] px-3 py-2 rounded-lg border border-[#2d1239]/10"
              >
                <span className="text-sm text-[#2d1239]/70 truncate flex-1">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeDocument(index)}
                  className="ml-2 text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
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
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading || uploadingDocs}
          className="flex-1 bg-[#2d1239] text-white px-6 py-3 rounded-xl hover:bg-[#2d1239]/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {(loading || uploadingDocs) && <Loader2 className="w-4 h-4 animate-spin" />}
          {uploadingDocs ? 'Uploading Documents...' : loading ? 'Submitting...' : 'Submit Application'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/grants/my-applications')}
          className="px-6 py-3 border border-[#2d1239]/20 text-[#2d1239] rounded-xl hover:bg-[#2d1239]/5 font-medium transition-colors"
        >
          Cancel
        </button>
      </div>

      <p className="text-sm text-[#2d1239]/50 mt-4">
        <span className="text-[#BCAFCF]">*</span> Required fields. Your application will be reviewed by our team.
      </p>
    </form>
  )
}