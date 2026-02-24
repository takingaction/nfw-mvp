// app/grants/page.tsx
'use client'

import Link from 'next/link'
import { Check, FileText, Eye, Banknote } from 'lucide-react'

export default function MicrograntsPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ── HERO ── matches landing Hero.tsx */}
      <div className="relative bg-[#2d1239] overflow-hidden">
        {/* Decorative background blurs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[#fdf493] rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-[#bcafcf] rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-[#d4f1ad] rounded-full opacity-10 blur-2xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center px-4 sm:px-6 lg:px-8 py-12">

            {/* Left — Text */}
            <div className="text-white space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#bcafcf]/20 border border-[#bcafcf]/30 rounded-full text-sm">
                <span className="text-[#fdf493]">✦</span>
                <span className="text-[#fffef1]">Now accepting applications — Spring 2026</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight">
                For the moments
                <br />
                <span className="text-[#fdf493]">that matter most.</span>
              </h1>

              <p className="text-lg sm:text-xl text-[#bcafcf] max-w-xl">
                Microgrants offer quick support for bills, essentials, and unexpected costs. Simple to apply. Fast to receive. Designed with care.
              </p>

              <div className="space-y-3 !mt-4">
                {[
                  { color: 'bg-[#d4f1ad]', text: 'Grants from $100 to $5,000' },
                  { color: 'bg-[#fdf493]', text: 'Real people review every application' },
                  { color: 'bg-[#b2d1ee]', text: 'Funds sent securely and quickly' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 ${item.color} rounded-full flex items-center justify-center`}>
                      <Check className="w-4 h-4 text-[#2d1239]" />
                    </div>
                    <span className="text-[#fffef1] font-medium">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/grants/apply"
                  className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="relative">Apply Today</span>
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="group relative inline-flex items-center justify-center px-8 py-4 bg-white/10 text-white border-2 border-white/20 rounded-xl font-bold text-lg overflow-hidden transition-all"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="relative">Become a Member</span>
                </Link>
              </div>
            </div>

            {/* Right — Glass card with image */}
            <div className="relative flex items-center justify-center">
              <div className="relative w-full max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-[#bcafcf] to-[#fdf493] rounded-full opacity-30 blur-3xl"></div>
                <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-6 lg:p-8 border-2 border-white/20 shadow-2xl transform rotate-2 transition-all duration-500">
                  <div className="relative rounded-2xl overflow-hidden mb-6 aspect-[4/3]">
                    <img
                      src="/images/microgrants-help.jpg"
                      alt="Women receiving microgrant support"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.parentElement!.style.background = 'linear-gradient(135deg, #d4f1ad 0%, #fdf493 50%, #b2d1ee 100%)'
                      }}
                    />
                  </div>
                  <div className="text-center space-y-3">
                    <h3 className="text-2xl lg:text-3xl font-black text-white leading-tight">
                      Real relief.
                      <br />
                      Real fast.
                    </h3>
                    <p className="text-[#bcafcf] text-base lg:text-lg leading-relaxed">
                      Helping women across all 50 states get the support they need.
                    </p>
                  </div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                </div>
                <div className="absolute -top-8 -right-8 w-16 h-16 bg-[#d4f1ad] rounded-full opacity-60"></div>
                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-[#fdf493] rounded-full opacity-60"></div>
                <div className="absolute top-1/2 -right-12 w-8 h-8 bg-[#bcafcf] rounded-full opacity-60"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── matches StatsSection.tsx */}
      <div className="bg-black py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {[
              { value: '$2.5M+', label: 'Grants Awarded', color: 'text-[#fdf493]' },
              { value: '$100–$5K', label: 'Grant Range', color: 'text-[#d4f1ad]' },
              { value: '50', label: 'States Served', color: 'text-[#b2d1ee]' },
              { value: '48hrs', label: 'Avg. Review Time', color: 'text-[#bcafcf]' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-4xl sm:text-5xl lg:text-6xl font-black mb-2 ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-[#bcafcf] text-sm sm:text-base font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── GRANTS GRID ── */}
      <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
        {/* Decorative blurs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-15 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-[#d4f1ad] to-[#b2d1ee] rounded-full opacity-15 blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight">
              Grants that help with
              <br />real-life needs
            </h2>
            <p className="text-lg text-[#2d1239]/70">
              Explore microgrants that cover emergencies, essentials, and the moments when life gets heavy.
            </p>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-10 scrollbar-hide justify-center flex-wrap">
            {['All', 'Childcare', 'Emergency Bills', 'Groceries', 'Medical', 'Transportation', 'Small Business'].map((pill, i) => (
              <button
                key={pill}
                className={`px-4 py-1.5 rounded-full whitespace-nowrap text-sm font-semibold transition-colors ${
                  i === 0
                    ? 'bg-[#2d1239] text-[#fffef1]'
                    : 'bg-white text-[#2d1239] border border-[#2d1239]/20 hover:bg-[#bcafcf]/20'
                }`}
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Grant Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: '$750 Healthcare Support',
                description: 'Supports medical appointments, prescriptions, or urgent health costs that pop up when you least need them.',
                closing: 'Closing Dec 31, 2026 • 9pm EST',
                partner: null,
                accent: '#b2d1ee',
              },
              {
                title: '$100 Rainy Day Fund',
                description: 'Quick relief for unexpected expenses — a bill, a co-pay, or anything that caught you off guard this month.',
                closing: 'Closing Dec 31, 2026 • 9pm EST',
                partner: null,
                accent: '#fdf493',
              },
              {
                title: '$300 Essentials Grant',
                description: 'Helps with groceries, home basics, or a week\'s worth of essentials during a tight month.',
                closing: 'Closing Feb 8, 2026 • 9pm EST',
                partner: 'Synergy',
                accent: '#d4f1ad',
              },
              {
                title: '$5,000 Small Business Starter',
                description: 'Provides seed funding for supplies, tools, or equipment to grow or launch a small business idea.',
                closing: 'Closing Jan 11, 2027 • 9pm EST',
                partner: 'Subaru',
                accent: '#fdf493',
              },
              {
                title: '$2,500 Mobility & Work Grant',
                description: 'Helps with transportation, job training, certifications, or anything that moves you forward.',
                closing: 'Closing Jan 3, 2027 • 9pm EST',
                partner: null,
                accent: '#bcafcf',
              },
              {
                title: '$500 Childcare Support',
                description: 'Covers childcare, school fees, or after-school care so it\'s easier to work or keep appointments.',
                closing: 'Closing Jan 11, 2027 • 9pm EST',
                partner: 'Phoenix',
                accent: '#b2d1ee',
              },
            ].map((grant) => (
              <div
                key={grant.title}
                className="group bg-white rounded-2xl border border-[#2d1239]/10 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative h-44 overflow-hidden" style={{ backgroundColor: `${grant.accent}30` }}>
                  <img
                    src="/images/microgrants-help.jpg"
                    alt={grant.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  {grant.partner && (
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-semibold text-[#2d1239]">
                      In Partnership with {grant.partner}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs text-[#2d1239]/40 mb-2">{grant.closing}</p>
                  <h3 className="text-lg font-black text-[#2d1239] mb-2">{grant.title}</h3>
                  <p className="text-sm text-[#2d1239]/60 mb-4 line-clamp-2">{grant.description}</p>
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
      </div>

      {/* ── HOW IT WORKS ── icons allowed per spec */}
      <div className="relative bg-[#bcafcf] py-16 lg:py-24 overflow-hidden">
        {/* Wave top */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none rotate-180">
          <svg className="relative block w-full h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" fill="white"></path>
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-semibold text-[#2d1239]/50 uppercase tracking-widest mb-3">Secure, simple and smart</p>
            <h2 className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight">
              How the microgrant
              <br />process works
            </h2>
            <p className="text-[#2d1239]/70 text-lg">
              Getting support should feel simple. Here's what to expect when you apply.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: FileText,
                title: 'Apply in a few minutes',
                description: 'Share the basics of your situation in a short, simple form. No lengthy paperwork.',
                color: 'from-[#d4f1ad] to-[#b2d1ee]',
              },
              {
                step: '02',
                icon: Eye,
                title: 'We review your request',
                description: 'A real person looks at your application with care. Most reviews happen within 48 hours.',
                color: 'from-[#fdf493] to-[#d4f1ad]',
              },
              {
                step: '03',
                icon: Banknote,
                title: 'Funds are sent securely',
                description: 'If approved, your grant is delivered by bank transfer or digital wallet — fast.',
                color: 'from-[#b2d1ee] to-[#bcafcf]',
              },
            ].map((step) => {
              const Icon = step.icon
              return (
                <div key={step.step} className="relative bg-white/40 backdrop-blur-md rounded-3xl p-8 border-2 border-white/50 shadow-xl text-center group">
                  <div className="absolute top-4 left-5 text-xs font-black text-[#2d1239]/30">{step.step}</div>
                  <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${step.color} rounded-full mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
                    <Icon className="w-10 h-10 text-[#2d1239]" />
                  </div>
                  <h3 className="text-xl font-black text-[#2d1239] mb-3">{step.title}</h3>
                  <p className="text-[#2d1239]/70">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" fill="white"></path>
          </svg>
        </div>
      </div>

      {/* ── HOW MUCH YOU CAN RECEIVE ── icons allowed per spec */}
      <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-15 blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-15 blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-3">Grant Amounts</p>
              <h2 className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight">
                How much you
                <br />can receive
              </h2>
              <p className="text-lg text-[#2d1239]/70 mb-8">
                Microgrants come in different amounts depending on your need — all designed to give you quick, meaningful relief.
              </p>
              <Link
                href="/grants/apply"
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative">Apply Today</span>
              </Link>
            </div>

            <div className="space-y-4">
              {[
                {
                  range: '$100 – $500',
                  label: 'Emergency Grants',
                  description: 'Urgent needs like utility payments, transit to work, childcare gaps, or groceries.',
                  color: '#b2d1ee',
                  checkColor: 'bg-[#b2d1ee]',
                },
                {
                  range: '$500 – $2,500',
                  label: 'Stability Grants',
                  description: 'Housing deposits, certifications, or medical expenses not covered by insurance.',
                  color: '#d4f1ad',
                  checkColor: 'bg-[#d4f1ad]',
                },
                {
                  range: '$2,500 – $5,000',
                  label: 'Business & Growth Grants',
                  description: 'A boost to help you start or grow a small business idea with real potential.',
                  color: '#bcafcf',
                  checkColor: 'bg-[#bcafcf]',
                },
              ].map((tier) => (
                <div
                  key={tier.range}
                  className="flex items-start gap-4 p-6 rounded-2xl border border-[#2d1239]/10 hover:shadow-md transition-all"
                  style={{ backgroundColor: `${tier.color}25` }}
                >
                  <div className={`flex-shrink-0 w-8 h-8 ${tier.checkColor} rounded-full flex items-center justify-center mt-0.5`}>
                    <Check className="w-5 h-5 text-[#2d1239]" />
                  </div>
                  <div>
                    <p className="font-black text-[#2d1239] text-lg">
                      {tier.range} <span className="font-semibold text-base">{tier.label}</span>
                    </p>
                    <p className="text-sm text-[#2d1239]/60 mt-1">{tier.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SUCCESS STORIES ── image-based, no icons */}
      <div className="relative bg-white py-16 lg:pb-40 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-15 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-[#d4f1ad] to-[#b2d1ee] rounded-full opacity-15 blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-2">Small wins matter</p>
              <h2 className="text-4xl sm:text-5xl font-black text-[#2d1239] leading-tight">
                Success Stories &
                <br />Everyday Wins
              </h2>
              <p className="text-[#2d1239]/60 mt-2 text-lg">Feel-good moments from women supporting women.</p>
            </div>
            <Link
              href="/articles"
              className="hidden sm:flex items-center gap-1 text-[#2d1239] font-semibold text-sm hover:text-[#2d1239]/70 transition-colors whitespace-nowrap"
            >
              See all stories →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                category: 'Everyday Expense',
                accent: '#d4f1ad',
                title: 'A microgrant helped me fix my car and get back to work',
              },
              {
                category: 'Parenting',
                accent: '#b2d1ee',
                title: 'Covering an unexpected bill gave me room to breathe',
              },
              {
                category: 'Medical Support',
                accent: '#bcafcf',
                title: 'Getting support for medical costs eased so much stress',
              },
            ].map((story) => (
              <div
                key={story.title}
                className="group bg-white rounded-2xl border border-[#2d1239]/10 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative h-44 overflow-hidden" style={{ backgroundColor: `${story.accent}30` }}>
                  <img
                    src="/images/microgrants-help.jpg"
                    alt={story.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
                <div className="p-5">
                  <span
                    className="inline-block text-xs px-2.5 py-1 rounded-full mb-3 font-semibold"
                    style={{ backgroundColor: `${story.accent}40`, color: '#2d1239' }}
                  >
                    {story.category}
                  </span>
                  <h3 className="font-black text-[#2d1239] mb-3 line-clamp-2">{story.title}</h3>
                  <Link href="/articles" className="text-sm font-semibold text-[#2d1239] hover:text-[#2d1239]/70 transition-colors">
                    Read more →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" fill="#2d1239"></path>
          </svg>
        </div>
      </div>

      {/* ── FINAL CTA ── matches FinalCTA.tsx exactly */}
      <div className="bg-gradient-to-br from-[#2d1239] to-[#4a1f5c] py-20 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-10 w-64 h-64 bg-[#fdf493] rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute bottom-20 left-10 w-64 h-64 bg-[#d4f1ad] rounded-full opacity-10 blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            Ready to get the
            <br />support you deserve?
          </h2>
          <p className="text-xl text-[#bcafcf] mb-8 max-w-2xl mx-auto">
            Join thousands of women who've already found relief through NFW microgrants. Your application takes just a few minutes.
          </p>

          <div className="grid sm:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
            {[
              { color: 'bg-[#d4f1ad]', title: 'Quick Application', sub: 'Takes just a few minutes' },
              { color: 'bg-[#fdf493]', title: 'Fast Review', sub: 'Decisions within 48 hours' },
              { color: 'bg-[#b2d1ee]', title: 'Secure Funds', sub: 'Sent directly to you' },
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
            href="/grants/apply"
            className="group relative inline-flex items-center justify-center px-10 py-5 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-xl overflow-hidden transition-all shadow-2xl"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative">Apply for a Microgrant Today</span>
          </Link>

          <p className="text-[#bcafcf] text-sm mt-6">
            Membership required to apply. <Link href="/auth/sign-up" className="underline hover:text-white transition-colors">Join free today →</Link>
          </p>
        </div>
      </div>

    </main>
  )
}