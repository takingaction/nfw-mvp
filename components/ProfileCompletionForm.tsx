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
  '$20k - $40k',
  '$40k - $60k',
  '$60k - $80k',
  '$80k+'
]

const IDENTITY_OPTIONS = [
  'AAPI',
  'Indigenous',
  'Latinx',
  'LGBTQIA+',
  'Middle Eastern',
  'Multiracial',
  'Woman',
  'GNB or GNC',
  'Disabled',
  'Immigrant',
  'Prefer Not to Say',
  'Other'
]

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
]

export default function ProfileCompletionForm({ 
  userId,
  existingProfile 
}: { 
  userId: string
  existingProfile?: any
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Pre-populate form with existing profile data
  const [formData, setFormData] = useState({
    full_name: existingProfile?.full_name || '',
    age_range: existingProfile?.age_range || '',
    phone_number: existingProfile?.phone_number || '',
    address_line1: existingProfile?.address_line1 || '',
    address_line2: existingProfile?.address_line2 || '',
    city: existingProfile?.city || '',
    state: existingProfile?.state || '',
    zip: existingProfile?.zip || '',
    household_income: existingProfile?.household_income || '',
    identities: existingProfile?.identities || [] as string[],
    social_handles: existingProfile?.social_handles || {
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
        .upsert({
          id: userId,
          full_name: formData.full_name,
          age_range: formData.age_range || null,
          phone_number: formData.phone_number || null,
          address_line1: formData.address_line1 || null,
          address_line2: formData.address_line2 || null,
          city: formData.city || null,
          state: formData.state || null,
          zip: formData.zip || null,
          household_income: formData.household_income || null,
          identities: formData.identities.length > 0 ? formData.identities : null,
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
    <form onSubmit={handleSubmit} className="space-y-8 bg-white shadow rounded-lg p-6">
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
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
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
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select age range</option>
          {AGE_RANGES.map(range => (
            <option key={range} value={range}>{range}</option>
          ))}
        </select>
      </div>

      {/* Phone Number */}
      <div>
        <label htmlFor="phone_number" className="block text-sm font-medium mb-1">
          Phone Number
        </label>
        <input
          id="phone_number"
          type="tel"
          value={formData.phone_number}
          onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
          placeholder="(555) 123-4567"
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Address Section */}
      <div className="space-y-4 border-t pt-6">
        <h3 className="text-lg font-semibold">Shipping Address</h3>
        <p className="text-sm text-gray-600">
          This address will be used for shipping items from the Zero Dollar Store.
        </p>
        
        {/* Address Line 1 */}
        <div>
          <label htmlFor="address_line1" className="block text-sm font-medium mb-1">
            Address Line 1
          </label>
          <input
            id="address_line1"
            type="text"
            value={formData.address_line1}
            onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
            placeholder="123 Main Street"
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Address Line 2 */}
        <div>
          <label htmlFor="address_line2" className="block text-sm font-medium mb-1">
            Address Line 2 (Optional)
          </label>
          <input
            id="address_line2"
            type="text"
            value={formData.address_line2}
            onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
            placeholder="Apartment, suite, unit, building, floor, etc."
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* City, State, ZIP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium mb-1">
              City
            </label>
            <input
              id="city"
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="New York"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium mb-1">
              State
            </label>
            <select
              id="state"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select state</option>
              {US_STATES.map(state => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
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
              placeholder="10001"
              maxLength={10}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Context & Identity Section */}
      <div className="space-y-4 border-t pt-6">
        <div>
          <h3 className="text-lg font-semibold">Context &amp; Identity</h3>
          <p className="text-sm text-gray-600">Helping us ensure equitable distribution.</p>
        </div>

        {/* Annual Household Income */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Annual Household Income
          </label>
          <p className="text-xs text-gray-500 mb-3">Select one option.</p>
          <div className="space-y-2">
            {INCOME_RANGES.map(range => (
              <label key={range} className="flex items-center">
                <input
                  type="radio"
                  name="household_income"
                  value={range}
                  checked={formData.household_income === range}
                  onChange={(e) => setFormData({ ...formData, household_income: e.target.value })}
                  className="mr-3 w-4 h-4"
                />
                <span className="text-sm">{range}</span>
              </label>
            ))}
          </div>
        </div>

        {/* I identify as... */}
        <div>
          <label className="block text-sm font-medium mb-1">
            I identify as...
          </label>
          <p className="text-xs text-gray-500 mb-3">Select all that apply</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {IDENTITY_OPTIONS.map(identity => (
              <label key={identity} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.identities.includes(identity)}
                  onChange={() => handleIdentityToggle(identity)}
                  className="mr-3 w-4 h-4"
                />
                <span className="text-sm">{identity}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Social Handles */}
      <div className="border-t pt-6">
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
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium text-lg"
      >
        {loading ? 'Saving Profile...' : existingProfile ? 'Update Profile' : 'Complete Profile'}
      </button>
    </form>
  )
}