'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, User, Users } from 'lucide-react'

interface GrantCycle {
  id: string
  cycle_name: string
  description: string
  end_date: string
  amount_per_grant: number
  grants_available: number
}

export default function GrantApplicationForm({
  userId,
  cycles,
}: {
  userId: string
  cycles: GrantCycle[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [isNominating, setIsNominating] = useState(false)

  const [formData, setFormData] = useState({
    cycle_id: cycles.length === 1 ? cycles[0].id : '',
    who_are_you: '',
    biggest_challenge: '',
    fund_usage: '',
  })

  const [documents, setDocuments] = useState<File[]>([])

  const inputClass = "w-full px-4 py-3 border border-[#2d1239]/20 rounded-xl text-[#2d1239] placeholder-[#2d1239]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#bcafcf] focus:border-transparent transition-all text-sm"
  const labelClass = "block text-sm font-semibold text-[#2d1239] mb-1.5"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!formData.cycle_id || !formData.who_are_you || !formData.biggest_challenge || !formData.fund_usage) {
        throw new Error('Please fill in all required fields')
      }

      const response = await fetch('/api/grants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          is_nominating: isNominating,
        }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      const grantId = data.grantId

            if (documents.length > 0) {
        setUploadingDocs(true)
        for (const file of documents) {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('grantId', grantId)
          const uploadRes = await fetch('/api/grants/upload-document', { method: 'POST', body: fd })
          const uploadData = await uploadRes.json()
          if (!uploadRes.ok) {
            console.error('Upload failed:', uploadData.error)
            throw new Error(`Failed to upload ${file.name}: ${uploadData.error}`)
          }
        }
      }

      router.push(`/grants/application-success?id=${grantId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to submit application')
      setLoading(false)
      setUploadingDocs(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(prev => [...prev, ...Array.from(e.target.files!)])
      e.target.value = ''
    }
  }

  const selectedCycle = cycles.find(c => c.id === formData.cycle_id)

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Grant Cycle Selection — multiple cycles */}
      {cycles.length > 1 && (
        <div>
          <p className={labelClass}>Which grant are you applying for? <span className="text-[#bcafcf]">*</span></p>
          <div className="space-y-2">
            {cycles.map(cycle => (
              <label
                key={cycle.id}
                className={`flex items-start justify-between gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.cycle_id === cycle.id
                    ? 'border-[#2d1239] bg-[#2d1239]/5'
                    : 'border-[#2d1239]/10 hover:border-[#2d1239]/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="cycle_id"
                    value={cycle.id}
                    checked={formData.cycle_id === cycle.id}
                    onChange={() => setFormData({ ...formData, cycle_id: cycle.id })}
                    className="accent-[#2d1239] mt-1"
                    required
                  />
                  <div>
                    <p className="font-bold text-[#2d1239]">{cycle.cycle_name}</p>
                    <p className="text-xs text-[#2d1239]/50 mt-0.5">
                      Deadline: {new Date(cycle.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    {cycle.description && (
                      <p className="text-xs text-[#2d1239]/60 mt-1">{cycle.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-black text-[#2d1239]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    ${cycle.amount_per_grant?.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#2d1239]/50">{cycle.grants_available} available</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Single cycle info card */}
      {cycles.length === 1 && selectedCycle && (
        <div className="bg-[#d4f1ad]/20 border border-[#d4f1ad] rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-black text-[#2d1239] text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {selectedCycle.cycle_name}
              </h3>
              <p className="text-sm text-[#2d1239]/60 mt-1">
                Deadline: {new Date(selectedCycle.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#2d1239]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                ${selectedCycle.amount_per_grant?.toLocaleString()}
              </p>
              <p className="text-xs text-[#2d1239]/50">{selectedCycle.grants_available} grants available</p>
            </div>
          </div>
        </div>
      )}

      {/* Nominating Toggle */}
      <div>
        <p className={labelClass}>Who is this application for? <span className="text-[#bcafcf]">*</span></p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsNominating(false)}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              !isNominating ? 'border-[#2d1239] bg-[#2d1239]/5' : 'border-[#2d1239]/10 hover:border-[#2d1239]/30'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!isNominating ? 'bg-[#2d1239]' : 'bg-[#2d1239]/10'}`}>
              <User className={`w-4 h-4 ${!isNominating ? 'text-white' : 'text-[#2d1239]'}`} />
            </div>
            <div className="text-left">
              <p className="font-bold text-[#2d1239] text-sm">Myself</p>
              <p className="text-xs text-[#2d1239]/50">I'm applying for me</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setIsNominating(true)}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              isNominating ? 'border-[#2d1239] bg-[#2d1239]/5' : 'border-[#2d1239]/10 hover:border-[#2d1239]/30'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isNominating ? 'bg-[#2d1239]' : 'bg-[#2d1239]/10'}`}>
              <Users className={`w-4 h-4 ${isNominating ? 'text-white' : 'text-[#2d1239]'}`} />
            </div>
            <div className="text-left">
              <p className="font-bold text-[#2d1239] text-sm">Someone else</p>
              <p className="text-xs text-[#2d1239]/50">I'm nominating someone</p>
            </div>
          </button>
        </div>
      </div>

      {/* Question 1 */}
      <div>
        <label className={labelClass}>
          {isNominating ? "Tell us about the person you're nominating." : 'Who are you?'}
          {' '}<span className="text-[#bcafcf]">*</span>
        </label>
        <p className="text-xs text-[#2d1239]/50 mb-2">
          {isNominating
            ? "Share their name, background, and why you're nominating them."
            : "Tell us a little about yourself — your situation, your life, what matters to you."
          }
        </p>
        <textarea
          value={formData.who_are_you}
          onChange={(e) => setFormData({ ...formData, who_are_you: e.target.value })}
          rows={4}
          maxLength={500}
          placeholder={isNominating ? "Her name is Maria. She's a single mom of three..." : "I'm a single mom living in Atlanta..."}
          className={inputClass + ' resize-none'}
          required
        />
        <p className="text-xs text-[#2d1239]/40 mt-1 text-right">{formData.who_are_you.length}/500</p>
      </div>

      {/* Question 2 */}
      <div>
        <label className={labelClass}>
          {isNominating ? "What is their biggest challenge right now?" : "What's the biggest challenge you're facing right now?"}
          {' '}<span className="text-[#bcafcf]">*</span>
        </label>
        <p className="text-xs text-[#2d1239]/50 mb-2">
          Be specific. The more we understand the situation, the better we can help.
        </p>
        <textarea
          value={formData.biggest_challenge}
          onChange={(e) => setFormData({ ...formData, biggest_challenge: e.target.value })}
          rows={5}
          maxLength={1000}
          placeholder={isNominating ? "She lost her job last month and her car needs repairs to get to interviews..." : "My car broke down last month and I can't get to work without it..."}
          className={inputClass + ' resize-none'}
          required
        />
        <p className="text-xs text-[#2d1239]/40 mt-1 text-right">{formData.biggest_challenge.length}/1000</p>
      </div>

      {/* Question 3 */}
      <div>
        <label className={labelClass}>
          {isNominating ? "How do you imagine they would use the microgrant funds?" : "What would you do with the microgrant funds?"}
          {' '}<span className="text-[#bcafcf]">*</span>
        </label>
        <p className="text-xs text-[#2d1239]/50 mb-2">
          {isNominating
            ? "Describe how you think the funds would make a difference for them."
            : "Tell us exactly how you'd use the money and what difference it would make."
          }
        </p>
        <textarea
          value={formData.fund_usage}
          onChange={(e) => setFormData({ ...formData, fund_usage: e.target.value })}
          rows={4}
          maxLength={500}
          placeholder={isNominating ? "The funds would cover her car repair so she can get back to work..." : "I would use the funds to repair my car so I can get back to work..."}
          className={inputClass + ' resize-none'}
          required
        />
        <p className="text-xs text-[#2d1239]/40 mt-1 text-right">{formData.fund_usage.length}/500</p>
      </div>

      {/* Document Upload */}
      <div>
        <label className={labelClass}>
          Supporting Documents <span className="text-[#2d1239]/40 font-normal">(Optional)</span>
        </label>
        <p className="text-xs text-[#2d1239]/50 mb-3">
          Upload receipts, quotes, or other supporting documents. PDF, JPG, PNG, DOC accepted.
        </p>
        <div className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-[#2d1239]/20 rounded-xl hover:border-[#2d1239]/40 hover:bg-[#2d1239]/5 transition-all relative">
          <p className="text-sm text-[#2d1239]/50 font-medium">Click to upload files</p>
          <p className="text-xs text-[#2d1239]/30 mt-1">PDF, JPG, PNG, DOC accepted</p>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        {documents.length > 0 && (
          <div className="mt-3 space-y-2">
            {documents.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-[#f8f7fa] px-3 py-2 rounded-lg border border-[#2d1239]/10">
                <span className="text-sm text-[#2d1239]/70 truncate flex-1">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                <button
                  type="button"
                  onClick={() => setDocuments(prev => prev.filter((_, i) => i !== index))}
                  className="ml-2 text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-4 pt-2">
        <button
          type="submit"
          disabled={loading || uploadingDocs || !formData.cycle_id}
          className="flex-1 bg-[#2d1239] text-white px-6 py-4 rounded-xl hover:bg-[#2d1239]/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-colors flex items-center justify-center gap-2"
        >
          {(loading || uploadingDocs) && <Loader2 className="w-4 h-4 animate-spin" />}
          {uploadingDocs ? 'Uploading Documents...' : loading ? 'Submitting...' : 'Submit Application →'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/grants/my-applications')}
          className="px-6 py-4 border border-[#2d1239]/20 text-[#2d1239] rounded-xl hover:bg-[#2d1239]/5 font-medium transition-colors"
        >
          Cancel
        </button>
      </div>

      <p className="text-xs text-[#2d1239]/40 text-center">
        Your application will be reviewed by our team. You cannot edit it after submission.
      </p>
    </form>
  )
}