'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Check, ChevronRight } from 'lucide-react'
import Link from 'next/link'

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
  'AAPI', 'Black', 'Indigenous', 'Latinx', 'LGBTQIA+', 'Immigrant',
  'Middle Eastern', 'Multi-racial', 'Woman', 'GNB or GNC', 'Disabled',
  'Parent', 'Caregiver', "I'd rather not say", 'Other',
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
]

const PLANS = [
  {
    id: 'contributing',
    name: 'Contributing Member',
    price: '$15',
    period: '/year',
    description: 'The most popular way to support NFW and unlock real benefits.',
    features: ['Apply for microgrants up to $1,000', '1,000+ member perks & discounts', 'Zero Dollar Store access', 'Voting rights on NFW initiatives'],
    priceId: 'price_1SwcFWCeca9TSF9AWfCnn2yk',
    highlighted: true,
    badge: 'Most Popular',
    color: 'border-[#2d1239] bg-[#2d1239]',
  },
  {
    id: 'founding',
    name: 'Founding Member',
    price: '$100',
    period: '/year',
    description: 'For women who want to make the biggest impact on the mission.',
    features: ['Everything in Contributing', 'Founding member recognition', 'Priority grant review', 'Direct input on NFW initiatives'],
    priceId: 'price_1SwcJeCeca9TSF9AetEiWuUB',
    highlighted: false,
    badge: 'Most Impact',
    color: 'border-[#2d1239]/20 bg-white',
  },
  {
    id: 'free',
    name: 'Free Member',
    price: '$0',
    period: 'forever',
    description: 'A warm welcome to the NFW community.',
    features: ['Community access', 'Monthly newsletter', 'Event notifications', 'Member articles & resources'],
    priceId: null,
    highlighted: false,
    badge: null,
    color: 'border-[#2d1239]/20 bg-white',
  },
]

const BENEFITS = [
  '💰 Microgrants from $100–$5,000',
  '🛍️ 1,000+ member perks & discounts',
  '🏪 Zero Dollar Store access',
  '🤝 A community that gets it',
  '⚡ Decisions within 48 hours',
  '🔒 Your data is always private',
]

const STEPS = ['Account', 'Personal Info', 'Identity', 'Membership']

export default function SignUpFlow() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 0
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')

  // Steps 1-2
  const [fullName, setFullName] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [income, setIncome] = useState('')
  const [identities, setIdentities] = useState<string[]>([])

  const toggleIdentity = (id: string) => {
    setIdentities(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const inputClass = "w-full px-4 py-3 border border-[#2d1239]/20 rounded-xl text-[#2d1239] placeholder-[#2d1239]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#bcafcf] focus:border-transparent transition-all text-sm"
  const labelClass = "block text-sm font-semibold text-[#2d1239] mb-1.5"

  // Step 0 — Create account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== repeatPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      setStep(1)
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  // Step 1 — Save personal info
  const handlePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          age_range: ageRange,
          phone_number: phone,
          city,
          state,
          zip,
        })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to save')
      setStep(2)
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — Save identity/income
  const handleIdentity = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ household_income: income, identities })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to save')
      setStep(3)
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  // Step 3 — Select membership
  const handleSelectPlan = async (plan: typeof PLANS[0]) => {
    if (!plan.priceId) {
      window.location.href = '/auth/welcome'
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId, membershipLevel: plan.id })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fffef1] flex">

      {/* Left — Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 xl:px-16">
        <div className="max-w-md w-full mx-auto">

          {/* Logo */}
          <Link href="/" className="inline-block mb-8">
            <img
              src="/images/header-logo.png"
              alt="NFW"
              className="h-12 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </Link>

          {/* Progress bar — steps 1-3 only */}
          {step > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {STEPS.slice(1).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      step > i + 1
                        ? 'bg-[#d4f1ad] text-[#2d1239]'
                        : step === i + 1
                        ? 'bg-[#2d1239] text-white'
                        : 'bg-[#2d1239]/10 text-[#2d1239]/40'
                    }`}>
                      {step > i + 1 ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={`text-xs font-semibold hidden sm:block ${step === i + 1 ? 'text-[#2d1239]' : 'text-[#2d1239]/40'}`}>{s}</span>
                    {i < STEPS.length - 2 && <ChevronRight className="w-3 h-3 text-[#2d1239]/20 ml-1" />}
                  </div>
                ))}
              </div>
              <div className="h-1.5 bg-[#2d1239]/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2d1239] rounded-full transition-all duration-500"
                  style={{ width: `${((step) / 3) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* ── STEP 0: Account ── */}
          {step === 0 && (
            <form onSubmit={handleCreateAccount} className="space-y-5">
              <div>
                <h1 className="text-3xl font-black text-[#2d1239] mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Create your account
                </h1>
                <p className="text-[#2d1239]/60 text-sm">
                  Already a member?{' '}
                  <Link href="/auth/login" className="text-[#2d1239] font-semibold underline">Sign in</Link>
                </p>
              </div>

              <div>
                <label className={labelClass}>Email address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Confirm password</label>
                <input type="password" required value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} placeholder="Repeat your password" className={inputClass} />
              </div>

              <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#2d1239] text-white rounded-xl font-bold text-base hover:bg-[#2d1239]/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Creating account...' : 'Continue →'}
              </button>

              <p className="text-xs text-[#2d1239]/40 text-center">
                By signing up you agree to our{' '}
                <Link href="/terms" className="underline">Terms</Link> and{' '}
                <Link href="/privacy" className="underline">Privacy Policy</Link>
              </p>
            </form>
          )}

          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <form onSubmit={handlePersonalInfo} className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-[#2d1239] mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Personal information</h2>
                <p className="text-[#2d1239]/60 text-sm">Help us get to know you a little better.</p>
              </div>

              <div>
                <label className={labelClass}>Full name <span className="text-[#bcafcf]">*</span></label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Age range <span className="text-[#bcafcf]">*</span></label>
                <select required value={ageRange} onChange={e => setAgeRange(e.target.value)} className={inputClass}>
                  <option value="">Select age range</option>
                  {AGE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Phone number <span className="text-[#bcafcf]">*</span></label>
                <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>City <span className="text-[#bcafcf]">*</span></label>
                  <input type="text" required value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>State <span className="text-[#bcafcf]">*</span></label>
                  <select required value={state} onChange={e => setState(e.target.value)} className={inputClass}>
                    <option value="">Select</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>ZIP code <span className="text-[#bcafcf]">*</span></label>
                <input type="text" required value={zip} onChange={e => setZip(e.target.value)} maxLength={5} pattern="[0-9]{5}" placeholder="12345" className={inputClass} />
              </div>

              <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#2d1239] text-white rounded-xl font-bold text-base hover:bg-[#2d1239]/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Saving...' : 'Continue →'}
              </button>
            </form>
          )}

          {/* ── STEP 2: Identity & Income ── */}
          {step === 2 && (
            <form onSubmit={handleIdentity} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-[#2d1239] mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Context & identity</h2>
                <p className="text-[#2d1239]/60 text-sm">This helps us serve you better. All information is private.</p>
              </div>

              <div>
                <label className={labelClass}>Which best describes your current annual income? <span className="text-[#bcafcf]">*</span></label>
                <div className="space-y-2 mt-2">
                  {INCOME_RANGES.map(range => (
                    <label key={range} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${income === range ? 'border-[#2d1239] bg-[#2d1239]/5' : 'border-[#2d1239]/10 hover:border-[#2d1239]/30'}`}>
                      <input type="radio" name="income" value={range} checked={income === range} onChange={() => setIncome(range)} className="accent-[#2d1239]" required />
                      <span className="text-sm text-[#2d1239] font-medium">{range}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Which identities do you identify with? <span className="text-[#2d1239]/40 font-normal">Select all that apply.</span></label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {IDENTITY_OPTIONS.map(id => (
                    <label key={id} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-sm ${identities.includes(id) ? 'border-[#bcafcf] bg-[#bcafcf]/10' : 'border-[#2d1239]/10 hover:border-[#2d1239]/20'}`}>
                      <input type="checkbox" checked={identities.includes(id)} onChange={() => toggleIdentity(id)} className="accent-[#2d1239] w-3.5 h-3.5" />
                      <span className="text-[#2d1239]">{id}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading || !income} className="w-full py-3.5 bg-[#2d1239] text-white rounded-xl font-bold text-base hover:bg-[#2d1239]/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Saving...' : 'Continue →'}
              </button>
            </form>
          )}

          {/* ── STEP 3: Membership ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-[#2d1239] mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Choose your membership</h2>
                <p className="text-[#2d1239]/60 text-sm">Every tier supports the mission. Upgrade anytime.</p>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="space-y-3">
                {PLANS.map(plan => (
                  <div key={plan.id} className={`rounded-2xl border-2 p-5 transition-all ${plan.highlighted ? 'border-[#2d1239] bg-[#2d1239]' : 'border-[#2d1239]/10 bg-white hover:border-[#2d1239]/30'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        {plan.badge && (
                          <span className={`inline-block text-xs px-2.5 py-1 rounded-full mb-2 font-semibold ${plan.highlighted ? 'bg-[#fdf493] text-[#2d1239]' : 'bg-[#bcafcf]/30 text-[#2d1239]'}`}>
                            {plan.badge}
                          </span>
                        )}
                        <h3 className={`font-black text-base ${plan.highlighted ? 'text-white' : 'text-[#2d1239]'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {plan.name}
                        </h3>
                        <p className={`text-xs mt-0.5 ${plan.highlighted ? 'text-[#bcafcf]' : 'text-[#2d1239]/50'}`}>{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-2xl font-black ${plan.highlighted ? 'text-[#fdf493]' : 'text-[#2d1239]'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>{plan.price}</span>
                        <span className={`text-xs ml-1 ${plan.highlighted ? 'text-[#bcafcf]' : 'text-[#2d1239]/40'}`}>{plan.period}</span>
                      </div>
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#d4f1ad] flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-[#2d1239]" />
                          </div>
                          <span className={`text-xs ${plan.highlighted ? 'text-[#fffef1]' : 'text-[#2d1239]/70'}`}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={loading}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                        plan.highlighted
                          ? 'bg-[#fdf493] text-[#2d1239] hover:bg-[#fdf493]/90'
                          : plan.id === 'free'
                          ? 'bg-[#2d1239]/5 text-[#2d1239] hover:bg-[#2d1239]/10 border border-[#2d1239]/10'
                          : 'bg-[#2d1239] text-white hover:bg-[#2d1239]/90'
                      }`}
                    >
                      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {plan.id === 'free' ? 'Continue for free' : `Join as ${plan.name} →`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Right — Benefits panel (desktop only) */}
      <div className="hidden lg:flex w-[420px] xl:w-[480px] bg-[#2d1239] flex-col justify-center px-12 py-16 relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-48 h-48 bg-[#fdf493] rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute bottom-20 left-10 w-48 h-48 bg-[#d4f1ad] rounded-full opacity-10 blur-3xl"></div>
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#bcafcf]/20 border border-[#bcafcf]/30 rounded-full text-xs mb-8">
            <span className="w-1.5 h-1.5 bg-[#d4f1ad] rounded-full"></span>
            <span className="text-[#fffef1] font-semibold">Join 50,000+ women</span>
          </div>
          <h2 className="text-3xl xl:text-4xl font-black text-white mb-4 leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Support that fits
            <br />
            <span className="text-[#fdf493]">your life.</span>
          </h2>
          <p className="text-[#bcafcf] text-sm mb-10 leading-relaxed">
            NFW membership gives you access to real financial support, everyday savings, and a community of women who get it.
          </p>

          <div className="space-y-4 mb-10">
            {BENEFITS.map(b => (
              <div key={b} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#d4f1ad]/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-[#d4f1ad]" />
                </div>
                <span className="text-[#fffef1] text-sm font-medium">{b}</span>
              </div>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#bcafcf]/30 flex items-center justify-center text-lg flex-shrink-0">T</div>
              <div>
                <p className="text-[#fffef1] text-sm leading-relaxed italic">
                  &ldquo;The perks alone saved me more than my membership cost in the first month. I wish I had found NFW sooner.&rdquo;
                </p>
                <p className="text-[#bcafcf] text-xs mt-2 font-semibold">Tiana, 29 — Retail Manager</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}