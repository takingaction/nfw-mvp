'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const AGE_RANGES = [
  'Under 18',
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
  'Prefer not to say'
]

const INCOME_RANGES = [
  'Under $20k',
  '$20k-$40k',
  '$40k-$60k',
  '$60k-$80k',
  '$80k+',
  'Prefer not to say'
]

const MEMBERSHIP_LEVELS = [
  { value: 'free', label: 'Free Membership' },
  { value: 'contributing', label: 'Contributing Member' },
  { value: 'founding', label: 'Founding Member' }
]

const IDENTITY_OPTIONS = [
  'LGBTQ+',
  'Person of Color',
  'Immigrant',
  'First Generation',
  'Disability',
  'Veteran',
  'Other'
]

export default function ProfileCompletionForm({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    full_name: '',
    age_range: '',
    phone_number: '',
    state: '',
    city: '',
    zip: '',
    household_income: '',
    identities: [] as string[],
    membership_level: 'free',
    social_handles: {
      twitter: '',
      instagram: '',
      facebook: '',
      linkedin: ''
    }
  })

  const handleIdentityToggle = (identity: string) => {
    setFormData(prev => ({
      ...prev,
      identities: prev.identities.includes(identity)
        ? prev.identities.filter(i => i !== identity)
        : [...prev.identities, identity]
    }))
  }

  const handleSocialHandleChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      social_handles: {
        ...prev.social_handles,
        [platform]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Filter out empty social handles
      const socialHandles = Object.fromEntries(
        Object.entries(formData.social_handles).filter(([_, v]) => v !== '')
      )

      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: formData.full_name,
          age_range: formData.age_range || null,
          phone_number: formData.phone_number || null,
          state: formData.state || null,
          city: formData.city || null,
          zip: formData.zip || null,
          household_income: formData.household_income || null,
          identities: formData.identities.length > 0 ? formData.identities : null,
          membership_level: formData.membership_level,
          social_handles: Object.keys(socialHandles).length > 0 ? socialHandles : null
        })

      if (error) throw error

      // Refresh the page to show the completed profile
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred while saving your profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow rounded-lg p-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Full Name - Required */}
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium mb-1">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          id="full_name"
          type="text"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          required
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      {/* Age Range */}
      <div>
        <label htmlFor="age_range" className="block text-sm font-medium mb-1">
          Age Range
        </label>
        <select
          id="age_range"
          value={formData.age_range}
          onChange={(e) => setFormData({ ...formData, age_range: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select age range</option>
          {AGE_RANGES.map(range => (
            <option key={range} value={range}>{range}</option>
          ))}
        </select>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone_number" className="block text-sm font-medium mb-1">
            Phone Number
          </label>
          <input
            id="phone_number"
            type="tel"
            value={formData.phone_number}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium mb-1">
            State
          </label>
          <input
            id="state"
            type="text"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium mb-1">
            City
          </label>
          <input
            id="city"
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label htmlFor="zip" className="block text-sm font-medium mb-1">
            ZIP Code
          </label>
          <input
            id="zip"
            type="text"
            value={formData.zip}
            onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      {/* Household Income */}
      <div>
        <label htmlFor="household_income" className="block text-sm font-medium mb-1">
          Household Income
        </label>
        <select
          id="household_income"
          value={formData.household_income}
          onChange={(e) => setFormData({ ...formData, household_income: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select income range</option>
          {INCOME_RANGES.map(range => (
            <option key={range} value={range}>{range}</option>
          ))}
        </select>
      </div>

      {/* Identities - Checkboxes */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Identities (select all that apply)
        </label>
        <div className="space-y-2">
          {IDENTITY_OPTIONS.map(identity => (
            <label key={identity} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.identities.includes(identity)}
                onChange={() => handleIdentityToggle(identity)}
                className="mr-2"
              />
              <span className="text-sm">{identity}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Membership Level */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Membership Level <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {MEMBERSHIP_LEVELS.map(level => (
            <label key={level.value} className="flex items-center">
              <input
                type="radio"
                name="membership_level"
                value={level.value}
                checked={formData.membership_level === level.value}
                onChange={(e) => setFormData({ ...formData, membership_level: e.target.value })}
                className="mr-2"
              />
              <span className="text-sm">{level.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Social Handles */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Social Media Handles (optional)
        </label>
        <div className="space-y-3">
          {['twitter', 'instagram', 'facebook', 'linkedin'].map(platform => (
            <div key={platform}>
              <label htmlFor={platform} className="block text-xs text-gray-600 mb-1 capitalize">
                {platform}
              </label>
              <input
                id={platform}
                type="text"
                value={formData.social_handles[platform as keyof typeof formData.social_handles]}
                onChange={(e) => handleSocialHandleChange(platform, e.target.value)}
                placeholder={`@username`}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {loading ? 'Saving Profile...' : 'Complete Profile'}
      </button>
    </form>
  )
}