import Link from 'next/link'
import { Check } from 'lucide-react'

const plans = [
  {
    id: 'free',
    name: 'Free Member',
    price: '$0',
    period: 'forever',
    description: 'A warm welcome to the NFW community.',
    features: [
      'Access to NFW community',
      'Monthly newsletter',
      'Event notifications',
      'Read member articles & resources',
    ],
    highlighted: false,
    badge: null,
  },
  {
    id: 'contributing',
    name: 'Contributing Member',
    price: '$15',
    period: '/year',
    description: 'The most popular way to support NFW and unlock real benefits.',
    features: [
      'Everything in Free',
      'Apply for microgrants up to $1,000',
      'Member perks & discounts platform',
      'Access to Zero Dollar Store',
      'Voting rights on NFW initiatives',
      'Member badge & recognition',
    ],
    highlighted: false,
    badge: 'Most Popular',
  },
  {
    id: 'founding',
    name: 'Founding Member',
    price: '$100',
    period: '/year',
    description: 'For women who want to make the biggest impact on the mission.',
    features: [
      'Everything in Contributing',
      'Founding member recognition',
      'Early access to events & programs',
      'Direct input on NFW initiatives',
      'Priority grant application review',
      'Exclusive founding member badge',
    ],
    highlighted: true,
    badge: 'Most Impact',
  },
]

const allBenefits = [
  { label: 'Community access', free: true, contributing: true, founding: true },
  { label: 'Monthly newsletter', free: true, contributing: true, founding: true },
  { label: 'Event notifications', free: true, contributing: true, founding: true },
  { label: 'Articles & resources', free: true, contributing: true, founding: true },
  { label: 'Microgrant applications', free: false, contributing: true, founding: true },
  { label: 'Perks & discounts platform', free: false, contributing: true, founding: true },
  { label: 'Zero Dollar Store access', free: false, contributing: true, founding: true },
  { label: 'Voting rights', free: false, contributing: true, founding: true },
  { label: 'Member badge', free: false, contributing: true, founding: true },
  { label: 'Founding member recognition', free: false, contributing: false, founding: true },
  { label: 'Early access to events', free: false, contributing: false, founding: true },
  { label: 'Direct input on initiatives', free: false, contributing: false, founding: true },
  { label: 'Priority grant review', free: false, contributing: false, founding: true },
]

export default function PricingPage() {
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
            <span className="text-[#fffef1] font-semibold">Membership that gives back</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Support that fits
            <br />
            <span className="text-[#fdf493]">your life.</span>
          </h1>
          <p className="text-xl text-[#bcafcf] max-w-2xl mx-auto mb-8">
            Every membership level helps fund the NFW mission. Choose the level that works for you — and unlock benefits that make a real difference in your everyday life.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-[#fffef1]/60 font-medium">
            <span>✦ Cancel anytime</span>
            <span>✦ Funds go directly to women in need</span>
            <span>✦ Join in minutes</span>
          </div>
        </div>
      </div>

      {/* PRICING CARDS */}
      <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-15 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-15 blur-3xl"></div>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-black text-[#2d1239] mb-3"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Choose your membership
            </h2>
            <p className="text-[#2d1239]/60 text-lg">
              Every tier supports the mission. Upgrade anytime as your needs grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 border transition-all ${
                  plan.highlighted
                    ? 'border-[#2d1239] bg-[#2d1239] shadow-2xl scale-105'
                    : 'border-[#2d1239]/10 bg-white shadow-sm hover:shadow-md'
                }`}
              >
                {plan.badge && (
                  <span
                    className={`inline-block text-xs px-3 py-1 rounded-full mb-4 font-semibold ${
                      plan.highlighted
                        ? 'bg-[#fdf493] text-[#2d1239]'
                        : 'bg-[#bcafcf]/30 text-[#2d1239]'
                    }`}
                  >
                    {plan.badge}
                  </span>
                )}

                <h3
                  className={`text-xl font-black mb-2 ${plan.highlighted ? 'text-white' : 'text-[#2d1239]'}`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {plan.name}
                </h3>

                <div className="mb-3">
                  <span className={`text-4xl font-black ${plan.highlighted ? 'text-[#fdf493]' : 'text-[#2d1239]'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ml-1 ${plan.highlighted ? 'text-[#bcafcf]' : 'text-[#2d1239]/50'}`}>
                    {plan.period}
                  </span>
                </div>

                <p className={`text-sm mb-6 ${plan.highlighted ? 'text-[#bcafcf]' : 'text-[#2d1239]/60'}`}>
                  {plan.description}
                </p>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                        plan.highlighted ? 'bg-[#d4f1ad]' : 'bg-[#d4f1ad]'
                      }`}>
                        <Check className="w-3 h-3 text-[#2d1239]" />
                      </div>
                      <span className={`text-sm ${plan.highlighted ? 'text-[#fffef1]' : 'text-[#2d1239]/70'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Single Join Now CTA */}
          <div className="text-center bg-[#fffef1] rounded-3xl p-10 border border-[#2d1239]/10">
            <h3
              className="text-2xl font-black text-[#2d1239] mb-3"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Ready to join?
            </h3>
            <p className="text-[#2d1239]/60 mb-6 max-w-md mx-auto">
              Create your free account first, then choose your membership level. It only takes a few minutes.
            </p>
            <Link
              href="/auth/sign-up"
              className="group relative inline-flex items-center justify-center px-10 py-4 bg-[#2d1239] text-[#fffef1] rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg hover:bg-[#2d1239]/90"
            >
              Join Now →
            </Link>
            <p className="text-[#2d1239]/40 text-sm mt-4">
              Already a member?{' '}
              <Link href="/auth/login" className="underline hover:text-[#2d1239] transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* FULL BENEFITS COMPARISON TABLE */}
      <div className="relative bg-[#f8f7fa] py-16 lg:py-24 overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-3">Everything included</p>
            <h2
              className="text-3xl sm:text-4xl font-black text-[#2d1239] mb-3"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Compare all benefits
            </h2>
            <p className="text-[#2d1239]/60">See exactly what's included at every level.</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#2d1239]/10 overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="grid grid-cols-4 bg-[#2d1239] px-6 py-4">
              <div className="text-[#bcafcf] text-sm font-semibold">Benefit</div>
              <div className="text-center text-[#bcafcf] text-sm font-semibold">Free</div>
              <div className="text-center text-[#fdf493] text-sm font-semibold">Contributing</div>
              <div className="text-center text-[#d4f1ad] text-sm font-semibold">Founding</div>
            </div>

            {/* Table Rows */}
            {allBenefits.map((benefit, i) => (
              <div
                key={benefit.label}
                className={`grid grid-cols-4 px-6 py-4 items-center ${
                  i % 2 === 0 ? 'bg-white' : 'bg-[#f8f7fa]'
                }`}
              >
                <div className="text-sm text-[#2d1239] font-medium">{benefit.label}</div>
                <div className="flex justify-center">
                  {benefit.free
                    ? <div className="w-5 h-5 rounded-full bg-[#d4f1ad] flex items-center justify-center"><Check className="w-3 h-3 text-[#2d1239]" /></div>
                    : <div className="w-5 h-5 rounded-full bg-[#2d1239]/10 flex items-center justify-center"><span className="text-[#2d1239]/30 text-xs">—</span></div>
                  }
                </div>
                <div className="flex justify-center">
                  {benefit.contributing
                    ? <div className="w-5 h-5 rounded-full bg-[#d4f1ad] flex items-center justify-center"><Check className="w-3 h-3 text-[#2d1239]" /></div>
                    : <div className="w-5 h-5 rounded-full bg-[#2d1239]/10 flex items-center justify-center"><span className="text-[#2d1239]/30 text-xs">—</span></div>
                  }
                </div>
                <div className="flex justify-center">
                  {benefit.founding
                    ? <div className="w-5 h-5 rounded-full bg-[#d4f1ad] flex items-center justify-center"><Check className="w-3 h-3 text-[#2d1239]" /></div>
                    : <div className="w-5 h-5 rounded-full bg-[#2d1239]/10 flex items-center justify-center"><span className="text-[#2d1239]/30 text-xs">—</span></div>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHY MEMBERSHIP MATTERS */}
      <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-15 blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-15 blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-3">Why it matters</p>
              <h2
                className="text-4xl sm:text-5xl font-black text-[#2d1239] mb-4 leading-tight"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Your membership
                <br />funds the mission
              </h2>
              <p className="text-lg text-[#2d1239]/70 mb-6">
                Every dollar from membership goes directly toward funding microgrants, building the perks platform, and advocating for women across the country. When you join, you're not just getting benefits — you're helping another woman get the support she needs.
              </p>
              <p className="text-lg text-[#2d1239]/70 mb-8">
                NFW is built on the belief that small, consistent support creates lasting change. Your membership is part of that.
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
                { color: '#d4f1ad', check: 'bg-[#d4f1ad]', title: '$2.5M+ in grants awarded', description: 'Member dues directly fund microgrants that help women cover emergency bills, childcare, medical costs and more.' },
                { color: '#fdf493', check: 'bg-[#fdf493]', title: '50,000+ women supported', description: 'A growing community of women across all 50 states finding relief, connection and resources through NFW.' },
                { color: '#b2d1ee', check: 'bg-[#b2d1ee]', title: '1,000+ perks & discounts', description: 'Members save an average of $500+ per year on everyday essentials through the NFW perks platform.' },
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
            Ready to feel supported?
          </h2>
          <p className="text-xl text-[#bcafcf] mb-8 max-w-2xl mx-auto">
            Join thousands of women who have already found relief, connection and real support through NFW. Your journey starts here.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
            {[
              { color: 'bg-[#d4f1ad]', title: 'Microgrants', sub: 'Up to $1,000 in support' },
              { color: 'bg-[#fdf493]', title: 'Exclusive Perks', sub: 'Save $500+ per year' },
              { color: 'bg-[#b2d1ee]', title: 'Community', sub: '50,000+ women strong' },
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
            <span className="relative">Become a Member Today</span>
          </Link>
          <p className="text-[#bcafcf] text-sm mt-6">Join in minutes. No credit card required to browse.</p>
        </div>
      </div>

    </main>
  )
}
