'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']

const INCOME_RANGES = [
  'Less than $25k',
  '$25k-50k',
  '$50-75k',
  '$75-$100k',
  '$100-150k',
  '$150-200k',
  '$200-250k',
  'More than $250k',
]

const IDENTITY_OPTIONS = [
  'AAPI',
  'Black',
  'Indigenous',
  'Latinx',
  'LGBTQIA+',
  'Immigrant',
  'Middle Eastern',
  'Multi-racial',
  'Woman',
  'GNB or GNC',
  'Disabled',
  'Parent',
  'Caregiver',
  "I'd rather not say",
  'Other',
]

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

interface ProfileFormData {
  full_name: string
  age_range: string
  phone_number: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  household_income: string
  identities: string[]
  social_handles: {
    instagram?: string
    twitter?: string
    facebook?: string
    linkedin?: string
  }
}

interface ProfileCompletionFormProps {
  userId: string
  existingProfile: any
}

export default function ProfileCompletionForm({ userId, existingProfile }: ProfileCompletionFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: existingProfile?.full_name || '',
    age_range: existingProfile?.age_range || '',
    phone_number: existingProfile?.phone_number || '',
    address_line1: existingProfile?.address_line1 || '',
    address_line2: existingProfile?.address_line2 || '',
    city: existingProfile?.city || '',
    state: existingProfile?.state || '',
    zip: existingProfile?.zip || '',
    household_income: existingProfile?.household_income || '',
    identities: existingProfile?.identities || [],
    social_handles: existingProfile?.social_handles || {}
  })

  const handleIdentityToggle = (identity: string) => {
    setFormData(prev => ({
      ...prev,
      identities: prev.identities.includes(identity)
        ? prev.identities.filter((i: string) => i !== identity)
        : [...prev.identities, identity]
    }))
  }

  const handleSocialHandleChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      social_handles: { ...prev.social_handles, [platform]: value }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Failed to save profile')

      setSuccess(true)
      setLoading(false)
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-2.5 border border-[#2d1239]/20 rounded-lg text-[#2d1239] placeholder-[#2d1239]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#BCAFCF] focus:border-transparent transition-all"
  const labelClass = "block text-sm font-medium text-[#2d1239] mb-2"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-[#d4f1ad]/40 border border-[#d4f1ad] rounded-xl">
          <p className="text-[#2d1239] font-semibold">Profile saved! Redirecting...</p>
        </div>
      )}

      {/* Full Name */}
      <div>
        <label className={labelClass}>Full Name <span className="text-[#BCAFCF]">*</span></label>
        <input
          type="text"
          required
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          className={inputClass}
        />
      </div>

      {/* Age Range */}
      <div>
        <label className={labelClass}>Age Range <span className="text-[#BCAFCF]">*</span></label>
        <select
          required
          value={formData.age_range}
          onChange={(e) => setFormData({ ...formData, age_range: e.target.value })}
          className={inputClass}
        >
          <option value="">Select age range</option>
          {AGE_RANGES.map(range => <option key={range} value={range}>{range}</option>)}
        </select>
      </div>

      {/* Phone Number */}
      <div>
        <label className={labelClass}>Phone Number <span className="text-[#BCAFCF]">*</span></label>
        <input
          type="tel"
          required
          value={formData.phone_number}
          onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
          placeholder="(555) 123-4567"
          className={inputClass}
        />
      </div>

      {/* Address */}
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Address Line 1 <span className="text-[#BCAFCF]">*</span></label>
          <input
            type="text"
            required
            value={formData.address_line1}
            onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
            placeholder="Street address"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Address Line 2 <span className="text-[#2d1239]/50">(Optional)</span></label>
          <input
            type="text"
            value={formData.address_line2}
            onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
            placeholder="Apt, suite, etc."
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>City <span className="text-[#BCAFCF]">*</span></label>
            <input
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>State <span className="text-[#BCAFCF]">*</span></label>
            <select
              required
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className={inputClass}
            >
              <option value="">Select</option>
              {US_STATES.map(state => <option key={state} value={state}>{state}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>ZIP Code <span className="text-[#BCAFCF]">*</span></label>
            <input
              type="text"
              required
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              maxLength={5}
              pattern="[0-9]{5}"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Household Income */}
      <div>
        <label className={labelClass}>
          Which of the following best describes your current annual income? <span className="text-[#BCAFCF]">*</span>
        </label>
        <select
          required
          value={formData.household_income}
          onChange={(e) => setFormData({ ...formData, household_income: e.target.value })}
          className={inputClass}
        >
          <option value="">Select income range</option>
          {INCOME_RANGES.map(range => <option key={range} value={range}>{range}</option>)}
        </select>
      </div>

      {/* Identities */}
      <div>
        <label className={labelClass}>
          Which of the following identities do you identify with? <span className="text-[#2d1239]/50">Please check all that apply.</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {IDENTITY_OPTIONS.map(identity => (
            <label
              key={identity}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                formData.identities.includes(identity)
                  ? 'border-[#BCAFCF] bg-[#BCAFCF]/10'
                  : 'border-[#2d1239]/20 hover:bg-[#f8f7fa]'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.identities.includes(identity)}
                onChange={() => handleIdentityToggle(identity)}
                className="w-4 h-4 text-[#2d1239] border-[#2d1239]/30 rounded focus:ring-[#BCAFCF] accent-[#2d1239]"
              />
              <span className="text-[#2d1239]">{identity}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Social Handles */}
      <div>
        <label className={labelClass}>Social Media Handles <span className="text-[#2d1239]/50">(Optional)</span></label>
        <div className="space-y-3">
          <input type="text" placeholder="Instagram (@username)" value={formData.social_handles.instagram || ''} onChange={(e) => handleSocialHandleChange('instagram', e.target.value)} className={inputClass} />
          <input type="text" placeholder="Twitter (@username)" value={formData.social_handles.twitter || ''} onChange={(e) => handleSocialHandleChange('twitter', e.target.value)} className={inputClass} />
          <input type="text" placeholder="Facebook (profile URL)" value={formData.social_handles.facebook || ''} onChange={(e) => handleSocialHandleChange('facebook', e.target.value)} className={inputClass} />
          <input type="text" placeholder="LinkedIn (profile URL)" value={formData.social_handles.linkedin || ''} onChange={(e) => handleSocialHandleChange('linkedin', e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-[#2d1239] text-white rounded-xl hover:bg-[#2d1239]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Saving...' : existingProfile ? 'Update Profile' : 'Complete Profile'}
      </button>
    </form>
  )
}