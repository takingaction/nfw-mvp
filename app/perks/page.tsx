'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'

const perks = [
  { category: 'Insurance', name: 'Fetch Pet Insurance', value: '5% off monthly premiums', color: '#fdf493' },
  { category: 'Travel', name: 'Zipcar Car Sharing', value: '25% off annual membership', color: '#b2d1ee' },
  { category: 'Health & Wellness', name: 'Calm & Co.', value: '20% off mindfulness membership', color: '#d4f1ad' },
  { category: 'Health & Wellness', name: 'CVS Pharmacy', value: 'Savings & Discounts by Optum Rx', color: '#d4f1ad' },
  { category: 'Entertainment', name: 'Ancestry', value: '50% off 1 year subscription', color: '#bcafcf' },
  { category: 'Shopping & Groceries', name: 'bistroMD', value: '25% off plus Free Shipping on your first order', color: '#fdf493' },
  { category: 'Health & Wellness', name: 'ClassPass', value: 'Discounted credits so you can go to the gym', color: '#d4f1ad' },
  { category: 'Shopping & Groceries', name: 'HelloFresh', value: '60% off your first box plus free shipping', color: '#fdf493' },
  { category: 'Technology & Learning', name: 'Skillshare', value: '30% off an annual membership', color: '#b2d1ee' },
  { category: 'Travel', name: 'Lyft Pass', value: 'Special member-only discounts', color: '#b2d1ee' },
  { category: 'Childcare & Family', name: 'Care.com', value: '50% off your first month', color: '#bcafcf' },
  { category: 'Shopping & Groceries', name: 'SUPERmarket', value: '25% off with free online shipping', color: '#fdf493' },
]

const categories = ['All', 'Childcare & Family', 'Entertainment', 'Insurance', 'Health & Wellness', 'Shopping & Groceries', 'Technology & Learning', 'Travel']

const testimonials = [
  { quote: 'Using the perks has taken so much pressure off my weekly budget. I didn\'t realize how much I could save.', name: 'Marion, 34', role: 'Elementary School Teacher' },
  { quote: 'The discounts on groceries & wellness things really add up. It feels like someone finally gets what moms need.', name: 'Danielle, 39', role: 'Medical Assistant' },
  { quote: 'I claimed a few deals I already needed and saved more in a month than my membership cost. It was such a relief.', name: 'Tiana, 29', role: 'Retail Manager' },
  { quote: 'I claimed a few deals I already needed and saved more in a month than my membership cost. It was such a relief.', name: 'Evelyn, 82', role: 'Retired Social Worker' },
  { quote: 'I love checking for new perks. There\'s always something that makes the week easier or a little brighter.', name: 'Lani, 21', role: 'Nursing Student' },
  { quote: 'As a student, every bit of savings helps. The travel and grocery perks have been game-changing for me.', name: 'Priya, 47', role: 'Administrative Coordinator' },
]

export default function PerksPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* HERO */}
      <div className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-64 h-64 bg-[#d4f1ad] rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-[#bcafcf] rounded-full opacity-20 blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2d1239]/10 border border-[#2d1239]/20 rounded-full text-sm">
                <span className="w-2 h-2 bg-[#d4f1ad] rounded-full"></span>
                <span className="text-[#2d1239] font-semibold">1,000+ member-only deals available now</span>
              </div>
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#2d1239] leading-[1.05]"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Save more on
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10">everyday</span>
                  <span className="absolute bottom-1 left-0 w-full h-4 bg-[#fdf493] -z-0 opacity-60"></span>
                </span>
                <br />
                essentials
              </h1>
              <p className="text-xl text-[#2d1239]/70 max-w-lg leading-relaxed">
                Explore member-only perks that make everyday essentials, wellness and travel more affordable. New deals are added often so you always find something helpful.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href="/perks"
                  className="inline-flex items-center justify-center px-8 py-4 bg-[#2d1239] text-[#fffef1] rounded-xl font-bold text-lg transition-all shadow-lg hover:bg-[#2d1239]/90"
                >
                  Browse All Perks →
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#2d1239] border-2 border-[#2d1239]/20 rounded-xl font-bold text-lg hover:border-[#2d1239] transition-all"
                >
                  Become a Member
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 pt-2 text-sm text-[#2d1239]/50 font-medium">
                <span>✦ 1,000+ member-only deals</span>
                <span>✦ New perks added weekly</span>
                <span>✦ Save $500+ per year</span>
              </div>
            </div>
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl">
                <img
                  src="/images/microgrants-help.jpg"
                  alt="Everyday savings for women"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.parentElement!.style.background = 'linear-gradient(135deg, #d4f1ad 0%, #bcafcf 100%)'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2d1239]/50 via-transparent to-transparent"></div>
                <div className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-4 shadow-xl">
                  <p className="text-2xl font-black text-[#2d1239]" style={{ fontFamily: 'Montserrat, sans-serif' }}>$500+</p>
                  <p className="text-xs text-[#2d1239]/60 font-medium">Average annual savings per member</p>
                </div>
                <div className="absolute top-5 right-5 bg-[#fdf493] rounded-2xl px-4 py-3 shadow-lg">
                  <p className="text-xs font-black text-[#2d1239]" style={{ fontFamily: 'Montserrat, sans-serif' }}>1,000+</p>
                  <p className="text-xs text-[#2d1239]/70">perks & discounts</p>
                </div>
              </div>
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-[#bcafcf] rounded-full opacity-50"></div>
              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-[#d4f1ad] rounded-full opacity-60"></div>
            </div>
          </div>
        </div>
      </div>

      {/* PERKS GRID */}
      <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-15 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-15 blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2
                className="text-3xl sm:text-4xl font-black text-[#2d1239] mb-2"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Everyday savings you can feel
              </h2>
              <p className="text-[#2d1239]/60">
                Members get access to fresh deals on things you already spend money on.
              </p>
            </div>
            <Link
              href="/perks"
              className="hidden sm:flex items-center gap-1 text-[#2d1239] font-semibold text-sm hover:text-[#2d1239]/70 transition-colors whitespace-nowrap ml-8"
            >
              See all perks →
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-3 mb-8 scrollbar-hide">
            {categories.map((cat, i) => (
              <button
                key={cat}
                className={`px-4 py-1.5 rounded-full whitespace-nowrap text-sm font-semibold transition-colors ${
                  i === 0
                    ? 'bg-[#2d1239] text-[#fffef1]'
                    : 'bg-white text-[#2d1239] border border-[#2d1239]/20 hover:bg-[#bcafcf]/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {perks.map((perk) => (
              <div
                key={perk.name}
                className="group bg-white rounded-2xl border border-[#2d1239]/10 p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span
                      className="inline-block text-xs px-2.5 py-1 rounded-full mb-2 font-semibold"
                      style={{ backgroundColor: `${perk.color}40`, color: '#2d1239' }}
                    >
                      {perk.category}
                    </span>
                    <h3
                      className="font-black text-[#2d1239] text-base"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      {perk.name}
                    </h3>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex-shrink-0 ml-3"
                    style={{ backgroundColor: `${perk.color}50` }}
                  ></div>
                </div>
                <p className="text-sm text-[#2d1239]/60 mb-3">{perk.value}</p>
                <Link
                  href="/perks"
                  className="text-xs font-semibold text-[#2d1239] hover:text-[#2d1239]/70 transition-colors"
                >
                  View details →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW PERKS WORK */}
      <div className="relative bg-[#bcafcf] py-16 lg:py-24 overflow-hidden">
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none rotate-180">
          <svg className="relative block w-full h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" fill="white"></path>
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-semibold text-[#2d1239]/50 uppercase tracking-widest mb-3">Secure, simple and smart</p>
            <h2
              className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              How perks and
              <br />discounts work
            </h2>
            <p className="text-[#2d1239]/70 text-lg">Getting savings should feel easy. Here is how you can use your perks today.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Browse and save', description: 'Explore deals on everyday essentials, wellness and more.', color: 'from-[#d4f1ad] to-[#b2d1ee]', icon: '🔍' },
              { step: '02', title: 'Activate your perk', description: 'Follow simple instructions to redeem your discount or offer.', color: 'from-[#fdf493] to-[#d4f1ad]', icon: '✅' },
              { step: '03', title: 'Enjoy the savings', description: 'Stretch your budget with lower costs on things you already buy.', color: 'from-[#b2d1ee] to-[#bcafcf]', icon: '💰' },
            ].map(({ step, title, description, color, icon }) => (
              <div key={step} className="relative bg-white/40 backdrop-blur-md rounded-3xl p-8 border-2 border-white/50 shadow-xl text-center group">
                <div className="absolute top-4 left-5 text-xs font-black text-[#2d1239]/30">{step}</div>
                <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${color} rounded-full mb-6 shadow-lg group-hover:scale-110 transition-all duration-300 text-3xl`}>
                  {icon}
                </div>
                <h3
                  className="text-xl font-black text-[#2d1239] mb-3"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {title}
                </h3>
                <p className="text-[#2d1239]/70">{description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" fill="white"></path>
          </svg>
        </div>
      </div>

      {/* WHY MEMBERS LOVE THEM */}
      <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-15 blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-15 blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-3">Made for real life</p>
              <h2
                className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Why members
                <br />love them
              </h2>
              <p className="text-lg text-[#2d1239]/70 mb-8">
                Perks are built to make everyday life easier. Members use them to save money on the things they already buy, discover helpful offers and find small moments of relief throughout the week.
              </p>
              <Link
                href="/auth/sign-up"
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative">Become a Member</span>
              </Link>
            </div>
            <div className="space-y-4">
              {[
                { color: '#d4f1ad', check: 'bg-[#d4f1ad]', title: 'Real savings you can feel', description: 'Many members save more than their membership cost. Discounts on essentials help your budget stretch further.' },
                { color: '#fdf493', check: 'bg-[#fdf493]', title: 'Helpful for everyday life', description: 'Perks cover things you use every day like groceries, health items and childcare bringing quick relief when life feels busy.' },
                { color: '#b2d1ee', check: 'bg-[#b2d1ee]', title: 'New deals added often', description: 'Fresh offers are added throughout the month so there is always something helpful to claim and enjoy.' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 p-6 rounded-2xl border border-[#2d1239]/10 hover:shadow-md transition-all"
                  style={{ backgroundColor: `${item.color}25` }}
                >
                  <div className={`flex-shrink-0 w-8 h-8 ${item.check} rounded-full flex items-center justify-center mt-0.5`}>
                    <Check className="w-5 h-5 text-[#2d1239]" />
                  </div>
                  <div>
                    <p className="font-black text-[#2d1239] mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>{item.title}</p>
                    <p className="text-sm text-[#2d1239]/60">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div className="relative bg-[#f8f7fa] py-16 lg:py-24 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-3">What members are saying</p>
            <h2
              className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Real stories from
              <br />our community
            </h2>
            <p className="text-[#2d1239]/60 text-lg">
              These everyday moments show how perks, savings and small bits of support can make life feel a little lighter.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-2xl border border-[#2d1239]/10 p-6 hover:shadow-lg transition-all duration-300"
              >
                <p className="text-[#2d1239]/70 text-sm leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#bcafcf]/40 flex items-center justify-center text-sm font-black text-[#2d1239]">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-[#2d1239] text-sm">{t.name}</p>
                    <p className="text-xs text-[#2d1239]/50">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SMALL WINS — matches SmallWins.tsx exactly */}
      <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-40 h-40 bg-[#fdf493] rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-[#bcafcf] rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-[#d4f1ad] rounded-full opacity-10 blur-2xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <h2
                className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#2d1239]"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Small wins matter. Let&apos;s celebrate yours.
              </h2>
              <p className="text-lg text-[#2d1239]/80">
                Stories, joy, and tiny moments of relief. Every day.
              </p>
              <Link
                href="/auth/sign-up"
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative">Become a Member →</span>
              </Link>
            </div>

            {/* Polaroid photo collage — identical to SmallWins.tsx */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative bg-white/40 backdrop-blur-sm p-3 shadow-lg transform rotate-2 hover:rotate-2 transition-transform border-2 border-white/50">
                  <div className="aspect-square bg-gradient-to-br from-[#bcafcf] to-[#fdf493] rounded">
                    <img
                      src="/images/member-1.jpg"
                      alt="NFW Member"
                      className="w-full h-full object-cover rounded"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  </div>
                </div>
                <div className="relative bg-white/40 backdrop-blur-sm p-3 shadow-lg transform -rotate-1 hover:-rotate-1 transition-transform mt-8 border-2 border-white/50">
                  <div className="aspect-square bg-gradient-to-br from-[#d4f1ad] to-[#b2d1ee] rounded">
                    <img
                      src="/images/member-2.jpg"
                      alt="NFW Member"
                      className="w-full h-full object-cover rounded"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  </div>
                </div>
                <div className="relative bg-white/40 backdrop-blur-sm p-3 shadow-lg transform -rotate-2 hover:-rotate-2 transition-transform -mt-4 border-2 border-white/50">
                  <div className="aspect-square bg-gradient-to-br from-[#fdf493] to-[#bcafcf] rounded">
                    <img
                      src="/images/member-3.jpg"
                      alt="NFW Member"
                      className="w-full h-full object-cover rounded"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  </div>
                </div>
                <div className="relative bg-white/40 backdrop-blur-sm p-3 shadow-lg transform rotate-1 hover:rotate-1 transition-transform border-2 border-white/50">
                  <div className="aspect-square bg-gradient-to-br from-[#b2d1ee] to-[#d4f1ad] rounded">
                    <img
                      src="/images/member-4.jpg"
                      alt="NFW Member"
                      className="w-full h-full object-cover rounded"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#fdf493] rounded-full opacity-40 -z-10"></div>
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-[#b2d1ee] rounded-full opacity-40"></div>
            </div>
          </div>
        </div>
        <div className="absolute top-10 right-1/4 w-12 h-12 bg-[#fdf493] rounded-full opacity-30"></div>
        <div className="absolute bottom-20 left-10 w-16 h-16 bg-[#bcafcf] rounded-full opacity-30"></div>
      </div>

      {/* FINAL CTA */}
      <div className="bg-gradient-to-br from-[#2d1239] to-[#4a1f5c] py-20 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-10 w-64 h-64 bg-[#fdf493] rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute bottom-20 left-10 w-64 h-64 bg-[#d4f1ad] rounded-full opacity-10 blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Trusted by{' '}
            <span className="text-[#bcafcf]">women</span>
            <br />across the country.
          </h2>
          <p className="text-xl text-[#bcafcf] mb-8 max-w-2xl mx-auto">
            From small towns to big cities, women are finding comfort, connection, and relief here.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
            {[
              { color: 'bg-[#d4f1ad]', title: '1,000+ Perks', sub: 'Across every category' },
              { color: 'bg-[#fdf493]', title: '$500+ Saved', sub: 'Average per member per year' },
              { color: 'bg-[#b2d1ee]', title: '50 States', sub: 'Women served nationwide' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 text-left">
                <div className={`flex-shrink-0 w-6 h-6 ${item.color} rounded-full flex items-center justify-center mt-1`}>
                  <Check className="w-4 h-4 text-[#2d1239]" />
                </div>
                <div>
                  <div className="text-white font-bold mb-1">{item.title}</div>
                  <div className="text-[#bcafcf] text-sm">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/auth/sign-up"
            className="group relative inline-flex items-center justify-center px-10 py-5 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-xl overflow-hidden transition-all shadow-2xl"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative">Join a community that cares →</span>
          </Link>
          <p className="text-[#bcafcf] text-sm mt-6">
            Already a member?{' '}
            <Link href="/perks" className="underline hover:text-white transition-colors">Browse perks now →</Link>
          </p>
        </div>
      </div>

    </main>
  )
}
