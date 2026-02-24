// app/grants/page.tsx
import Link from 'next/link'
import Image from 'next/image'

export default function MicrograntsPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ── HERO ── */}
      <section className="bg-[#fffef1] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Icon badge */}
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#fdf493] rounded-xl mb-6">
                <span className="text-2xl">💛</span>
              </div>
              <h1
                className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                For the moments
                <br />that matter
              </h1>
              <p className="text-[#2d1239]/60 text-lg max-w-md">
                Microgrants offer quick support for bills, essentials or unexpected costs. Simple to apply. Fast to receive. Designed with care.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/grants/apply"
                  className="px-6 py-3 bg-[#2d1239] text-[#fffef1] rounded-full font-semibold hover:bg-[#2d1239]/90 transition-colors"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Apply Today →
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="px-6 py-3 bg-white text-[#2d1239] border-2 border-[#2d1239]/20 rounded-full font-semibold hover:border-[#2d1239] transition-colors"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Become a Member
                </Link>
              </div>
            </div>
            <div className="relative h-72 lg:h-96 rounded-2xl overflow-hidden shadow-xl">
              <div className="w-full h-full bg-[#bcafcf]/30 flex items-center justify-center">
                <span className="text-8xl opacity-40">✍️</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GRANTS GRID ── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2
                className="text-3xl font-black text-[#2d1239] mb-2"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Grants that help with real-life needs
              </h2>
              <p className="text-[#2d1239]/60">
                Explore microgrants that cover emergencies, essentials and the moments when life gets heavy.
              </p>
            </div>
            <Link
              href="/grants/apply"
              className="hidden sm:flex items-center gap-1 text-[#2d1239] font-semibold text-sm hover:text-[#2d1239]/70 transition-colors whitespace-nowrap mt-1"
            >
              See all microgrants →
            </Link>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-8 scrollbar-hide">
            {[
              { label: 'All', active: true },
              { label: 'Childcare support', active: false },
              { label: 'Emergency bills', active: false },
              { label: 'Groceries and essentials', active: false },
              { label: 'Medical and wellness', active: false },
              { label: 'More and transportation', active: false },
            ].map((pill) => (
              <button
                key={pill.label}
                className={`px-4 py-1.5 rounded-full whitespace-nowrap text-sm font-semibold transition-colors ${
                  pill.active
                    ? 'bg-[#2d1239] text-[#fffef1]'
                    : 'bg-white text-[#2d1239] border border-[#2d1239]/20 hover:bg-[#bcafcf]/20'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Grant Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: '$750 Healthcare Support',
                description: 'Supports medical appointments, prescriptions or urgent health costs that pop up when you least need them.',
                amount: '$750',
                category: 'Medical and wellness',
                emoji: '🏥',
                closing: 'Closing Dec 31, 2025 • 9pm EST',
                color: '#b2d1ee',
              },
              {
                title: '$100 Rainy Day Fund',
                description: 'Supports medical appointments, prescriptions or urgent health costs that pop up when you least need them.',
                amount: '$100',
                category: 'Emergency bills',
                emoji: '🌧️',
                closing: 'Closing Dec 31, 2025 • 9pm EST',
                color: '#fdf493',
              },
              {
                title: '$300 Essentials Grant',
                description: 'Helps with groceries, home basics or a week\'s worth of essentials during a tight month.',
                amount: '$300',
                category: 'Groceries and essentials',
                emoji: '🛒',
                closing: 'Closing Feb 8, 2025 • 9pm EST',
                color: '#d4f1ad',
                partner: 'Synergy',
              },
              {
                title: '$5,000 Small Business Starter',
                description: 'Provides seed funding for supplies, tools or equipment to grow or launch a small business idea.',
                amount: '$5,000',
                category: 'Small business',
                emoji: '💼',
                closing: 'Closing Jan 11, 2026 • 9pm EST',
                color: '#fdf493',
                partner: 'Subaru',
              },
              {
                title: '$2,500 Mobility and Work Grant',
                description: 'Helps with transportation, job training, certifications or anything that moves you forward.',
                amount: '$2,500',
                category: 'Transportation',
                emoji: '🚗',
                closing: 'Closing Jan 3, 2026 • 9pm EST',
                color: '#bcafcf',
              },
              {
                title: '$500 Childcare Support',
                description: 'Covers two-minute childcare, school fees or after-school care so it\'s easier to work or appoint...',
                amount: '$500',
                category: 'Childcare support',
                emoji: '👶',
                closing: 'Closing Jan 11, 2026 • 9pm EST',
                color: '#b2d1ee',
                partner: 'Phoenix',
              },
            ].map((grant) => (
              <div
                key={grant.title}
                className="group bg-white rounded-2xl border border-[#2d1239]/10 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Card Image Placeholder */}
                <div
                  className="h-44 flex items-center justify-center relative"
                  style={{ backgroundColor: `${grant.color}30` }}
                >
                  <span className="text-6xl opacity-40">{grant.emoji}</span>
                  {grant.partner && (
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-semibold text-[#2d1239]">
                      In Partnership with {grant.partner}
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <p className="text-xs text-[#2d1239]/40 mb-2">{grant.closing}</p>
                  <h3
                    className="text-lg font-bold text-[#2d1239] mb-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {grant.title}
                  </h3>
                  <p className="text-sm text-[#2d1239]/60 mb-4 line-clamp-2">
                    {grant.description}
                  </p>
                  <Link
                    href="/grants/apply"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#2d1239] hover:text-[#2d1239]/70 transition-colors"
                  >
                    Apply today →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 bg-[#f8f7fa]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-3">
            Secure, simple and smart
          </p>
          <h2
            className="text-3xl font-black text-[#2d1239] mb-3"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            How the microgrant process works
          </h2>
          <p className="text-[#2d1239]/60 mb-12">
            Getting support should feel simple. Here is what to expect when you apply for a microgrant.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Apply in a few minutes',
                description: 'Share the basics of your situation in a short, simple form.',
                icon: '📝',
              },
              {
                step: '02',
                title: 'We review your request',
                description: 'A real person looks at your application with care each week.',
                icon: '👀',
              },
              {
                step: '03',
                title: 'Funds are sent securely',
                description: 'If approved, your grant is delivered by bank transfer or digital wallet.',
                icon: '💸',
              },
            ].map((step) => (
              <div key={step.step} className="bg-white rounded-2xl p-6 border border-[#2d1239]/10 text-left">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-black text-[#bcafcf]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {step.step}
                  </span>
                  <span className="text-2xl">{step.icon}</span>
                </div>
                <h3
                  className="font-bold text-[#2d1239] mb-2"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {step.title}
                </h3>
                <p className="text-sm text-[#2d1239]/60">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW MUCH YOU CAN RECEIVE ── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-3">
                Grants Amount
              </p>
              <h2
                className="text-3xl font-black text-[#2d1239] mb-4"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                How much you can receive
              </h2>
              <p className="text-[#2d1239]/60">
                Microgrants come in different amounts depending on your need. All designed to give you quick relief.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  range: '$100 to $500 Emergency Grants',
                  description: 'Helps with urgent needs like utility payment, transit to work, childcare gaps or groceries.',
                  color: '#b2d1ee',
                  icon: '💙',
                },
                {
                  range: '$500 to $2,500 Stability Grants',
                  description: 'Supports important milestones like housing deposits, certifications or medical expenses that are not covered.',
                  color: '#d4f1ad',
                  icon: '💚',
                },
                {
                  range: '$2,500 to $5,000 Business and Growth Grants',
                  description: '$2,500 to $5,000 Business and Growth Grants. A boost to help you start or grow a business idea.',
                  color: '#bcafcf',
                  icon: '💜',
                },
              ].map((tier) => (
                <div
                  key={tier.range}
                  className="flex items-start gap-4 p-5 rounded-2xl border border-[#2d1239]/10 hover:shadow-md transition-all"
                  style={{ backgroundColor: `${tier.color}20` }}
                >
                  <span className="text-2xl mt-0.5">{tier.icon}</span>
                  <div>
                    <p
                      className="font-bold text-[#2d1239] mb-1"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      {tier.range}
                    </p>
                    <p className="text-sm text-[#2d1239]/60">{tier.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SUCCESS STORIES ── */}
      <section className="py-16 bg-[#f8f7fa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-2">
                Small wins matter
              </p>
              <h2
                className="text-3xl font-black text-[#2d1239]"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Success Stories & Everyday Wins
              </h2>
              <p className="text-[#2d1239]/60 mt-1">Feel-good moments from women supporting women.</p>
            </div>
            <Link
              href="/articles"
              className="hidden sm:flex items-center gap-1 text-[#2d1239] font-semibold text-sm hover:text-[#2d1239]/70 transition-colors"
            >
              See all success stories →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[
              {
                category: 'Everyday Expense',
                categoryColor: '#d4f1ad',
                title: 'A microgrant helped me fix my car and get back to work',
                image: '🚗',
                bg: '#d4f1ad',
              },
              {
                category: 'Parenting',
                categoryColor: '#b2d1ee',
                title: 'Covering an unexpected bill gave me room to breathe',
                image: '🌿',
                bg: '#b2d1ee',
              },
              {
                category: 'Medical Support',
                categoryColor: '#bcafcf',
                title: 'Getting support for medical costs eased so much stress',
                image: '🏥',
                bg: '#bcafcf',
              },
            ].map((story) => (
              <div
                key={story.title}
                className="group bg-white rounded-2xl border border-[#2d1239]/10 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className="h-44 flex items-center justify-center"
                  style={{ backgroundColor: `${story.bg}40` }}
                >
                  <span className="text-6xl opacity-50">{story.image}</span>
                </div>
                <div className="p-5">
                  <span
                    className="inline-block text-xs px-2.5 py-1 rounded-full mb-3 font-semibold"
                    style={{ backgroundColor: `${story.categoryColor}40`, color: '#2d1239' }}
                  >
                    {story.category}
                  </span>
                  <h3
                    className="font-bold text-[#2d1239] mb-3 line-clamp-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {story.title}
                  </h3>
                  <Link
                    href="/articles"
                    className="text-sm font-semibold text-[#2d1239] hover:text-[#2d1239]/70 transition-colors"
                  >
                    Read more →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-16 bg-[#fffef1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Small wins matter.
                <br />Let's celebrate yours.
              </h2>
              <p className="text-[#2d1239]/60 mb-8">
                Stories, joy, and tiny moments of relief. Every day.
              </p>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#bcafcf] text-[#2d1239] rounded-full font-semibold hover:bg-[#bcafcf]/80 transition-colors"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Become a Member ✦
              </Link>
            </div>
            {/* Photo collage placeholder */}
            <div className="grid grid-cols-2 gap-3">
              {['💪', '🌸', '👩‍👧', '✨'].map((emoji, i) => (
                <div
                  key={i}
                  className={`rounded-2xl flex items-center justify-center text-5xl ${
                    i === 0 ? 'h-48' : i === 3 ? 'h-48' : 'h-36'
                  }`}
                  style={{
                    backgroundColor: ['#bcafcf30', '#d4f1ad30', '#b2d1ee30', '#fdf49330'][i],
                  }}
                >
                  {emoji}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST FOOTER BANNER ── */}
      <section className="py-12 bg-[#2d1239]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3
                className="text-2xl font-black text-[#fffef1] mb-2"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Trusted by <span className="text-[#bcafcf]">women</span> across the country.
              </h3>
              <p className="text-[#bcafcf]/70 text-sm">
                From small towns to big cities, women are finding comfort, connection, and relief here.
              </p>
            </div>
            <Link
              href="/auth/sign-up"
              className="flex items-center gap-2 px-6 py-3 bg-[#fffef1] text-[#2d1239] rounded-full font-semibold hover:bg-white transition-colors whitespace-nowrap"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Join a community that cares →
            </Link>
          </div>
        </div>
      </section>

    </main>
  )
}