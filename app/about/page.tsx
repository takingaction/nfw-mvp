import Link from 'next/link'
import { Check } from 'lucide-react'

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* HERO */}
      <div className="relative bg-[#2d1239] overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[#fdf493] rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-[#bcafcf] rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-[#d4f1ad] rounded-full opacity-10 blur-2xl"></div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#bcafcf]/20 border border-[#bcafcf]/30 rounded-full text-sm mb-6">
            <span className="w-2 h-2 bg-[#d4f1ad] rounded-full"></span>
            <span className="text-[#fffef1] font-semibold">Our Story</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Built by women.
            <br />
            <span className="text-[#fdf493]">For women.</span>
          </h1>
          <p className="text-xl text-[#bcafcf] max-w-2xl mx-auto">
            The National Fund for Women is a membership-based community that helps millions of women at the individual level and champions their shared interests.
          </p>
        </div>
      </div>

      {/* MISSION */}
      <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-15 blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-15 blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-3">Why we exist</p>
              <h2
                className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-6 leading-tight"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Real support for
                <br />real life moments
              </h2>
              <p className="text-lg text-[#2d1239]/70 mb-4 leading-relaxed">
                Women across America are navigating rising costs, caregiving pressures, wage gaps, and unexpected emergencies — often without a safety net. NFW was created to change that.
              </p>
              <p className="text-lg text-[#2d1239]/70 mb-8 leading-relaxed">
                We believe that small, consistent support creates lasting change. Through microgrants, exclusive perks, and a community that truly gets it, we help women find relief — not someday, but today.
              </p>
              <Link
                href="/auth/sign-up"
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative">Join the Community →</span>
              </Link>
            </div>
            <div className="space-y-4">
              {[
                { color: '#d4f1ad', check: 'bg-[#d4f1ad]', title: 'Celebrate every woman', description: 'We uplift and affirm all women — through daily life moments, feel-good content, and a community that champions your wins big and small.' },
                { color: '#fdf493', check: 'bg-[#fdf493]', title: 'Provide relief you can feel', description: 'From microgrants to perks to the Zero Dollar Store, every benefit is designed to ease real pressure in your everyday life.' },
                { color: '#b2d1ee', check: 'bg-[#b2d1ee]', title: 'Champion shared interests', description: 'NFW advocates for women at the individual level and the collective level — because what\'s good for one woman is good for all of us.' },
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

      {/* WHO WE SERVE */}
      <div className="relative bg-[#f8f7fa] py-16 lg:py-24 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-3">Our community</p>
            <h2
              className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Women at every
              <br />stage of life
            </h2>
            <p className="text-[#2d1239]/60 text-lg">
              NFW membership is open to all women 18 and older residing in the United States. We welcome women from all backgrounds and circumstances.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Young Women', age: '18–34', description: 'Navigating cost of living, student debt, and building a future in a complicated world.', color: '#fdf493' },
              { title: 'Moms of Young Kids', age: 'All ages', description: 'Balancing childcare costs, limited time, and the daily demands of raising a family.', color: '#d4f1ad' },
              { title: 'Moms of Older Kids', age: 'Gen X', description: 'Managing college prep, work-life balance, and caring for loved ones all at once.', color: '#b2d1ee' },
              { title: 'Grandmas & Elders', age: '55+', description: 'Living on fixed incomes while supporting the next generation and leaving a legacy.', color: '#bcafcf' },
            ].map((group) => (
              <div
                key={group.title}
                className="bg-white rounded-2xl border border-[#2d1239]/10 p-6 hover:shadow-lg transition-all duration-300"
              >
                <div
                  className="w-12 h-12 rounded-xl mb-4"
                  style={{ backgroundColor: `${group.color}50` }}
                ></div>
                <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-1">{group.age}</p>
                <h3
                  className="font-black text-[#2d1239] mb-2"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {group.title}
                </h3>
                <p className="text-sm text-[#2d1239]/60">{group.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHAT WE OFFER */}
      <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-15 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-[#d4f1ad] to-[#b2d1ee] rounded-full opacity-15 blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-3">What membership includes</p>
            <h2
              className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Everything you need.
              <br />Nothing you don&apos;t.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Microgrants', description: 'Apply for grants from $100 to $5,000 to cover emergency bills, childcare, medical costs, car repairs, and more. Real people review every application within 48 hours.', color: '#d4f1ad', link: '/grants', cta: 'Learn about grants' },
              { title: 'Perks & Discounts', description: 'Access 1,000+ member-only deals on groceries, wellness, travel, childcare, and everyday essentials. Members save an average of $500+ per year.', color: '#b2d1ee', link: '/perks/info', cta: 'Explore perks' },
              { title: 'Zero Dollar Store', description: 'Claim free essential items whenever you need them — hygiene products, household items, and more. No questions asked, no judgment.', color: '#fdf493', link: '/store', cta: 'Visit the store' },
            ].map((item) => (
              <div
                key={item.title}
                className="group bg-white rounded-2xl border border-[#2d1239]/10 p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className="w-14 h-14 rounded-2xl mb-6"
                  style={{ backgroundColor: `${item.color}50` }}
                ></div>
                <h3
                  className="text-xl font-black text-[#2d1239] mb-3"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {item.title}
                </h3>
                <p className="text-[#2d1239]/60 mb-6 leading-relaxed">{item.description}</p>
                <Link
                  href={item.link}
                  className="text-sm font-semibold text-[#2d1239] hover:text-[#2d1239]/70 transition-colors"
                >
                  {item.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="bg-[#2d1239] py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {[
              { value: '50K+', label: 'Active Members', color: 'text-[#fdf493]' },
              { value: '$2.5M+', label: 'Grants Awarded', color: 'text-[#d4f1ad]' },
              { value: '50', label: 'States Represented', color: 'text-[#b2d1ee]' },
              { value: '1,000+', label: 'Perks & Discounts', color: 'text-[#bcafcf]' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-4xl sm:text-5xl font-black mb-2 ${stat.color}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>{stat.value}</div>
                <div className="text-[#bcafcf] text-sm sm:text-base font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
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
            Feel supported.
            <br />
            <span className="text-[#fdf493]">Feel empowered.</span>
          </h2>
          <p className="text-xl text-[#bcafcf] mb-8 max-w-2xl mx-auto">
            Join thousands of women who have already found relief, connection, and real support through NFW.
          </p>
          <Link
            href="/auth/sign-up"
            className="group relative inline-flex items-center justify-center px-10 py-5 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-xl overflow-hidden transition-all shadow-2xl"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative">Become a Member Today</span>
          </Link>
          <p className="text-[#bcafcf] text-sm mt-6">Free to join. Upgrade anytime.</p>
        </div>
      </div>

    </main>
  )
}
