import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        question: 'What is the National Fund for Women?',
        answer: 'NFW is a membership-based community that helps American women at the individual level through direct financial support, exclusive savings, and a community that truly gets it. We offer microgrants, a perks & discounts platform, and the Zero Dollar Store — all designed to provide real relief for real life moments.'
      },
      {
        question: 'Who can join NFW?',
        answer: 'NFW membership is open to all women 18 and older residing in the United States. We welcome women from all backgrounds, income levels, and circumstances. Whether you\'re a young woman just starting out, a mom juggling it all, or a grandmother on a fixed income — there\'s a place for you here.'
      },
      {
        question: 'How do I join?',
        answer: 'Simply create a free account at nfw.org. Sign up takes just a few minutes — no credit card required to get started. Once you\'re in, you can explore all the benefits and choose a paid membership tier whenever you\'re ready.'
      },
      {
        question: 'Is there a free membership option?',
        answer: 'Yes! Free membership gives you access to the NFW community, our monthly newsletter, event notifications, and member articles & resources. It\'s a great way to get started and see if NFW is right for you before upgrading.'
      },
    ]
  },
  {
    category: 'Membership & Pricing',
    questions: [
      {
        question: 'How much does membership cost?',
        answer: 'NFW membership starts free. A Contributing Membership is $15/year and unlocks microgrants, the perks & discounts platform, the Zero Dollar Store, and voting rights. A Founding Membership is $100/year and includes everything in Contributing, plus founding member recognition, priority grant review, and direct input on NFW initiatives. Visit our Pricing page to compare all plans.'
      },
      {
        question: 'What do I get with a Contributing Membership?',
        answer: 'For just $15/year — that\'s about $1.25/month — you get access to microgrant applications (up to $1,000), 1,000+ member perks & discounts, the Zero Dollar Store, voting rights on NFW initiatives, and a member badge. Most members save far more than $15 in their first month through the perks platform alone.'
      },
      {
        question: 'Can I cancel my membership anytime?',
        answer: 'Absolutely. You can cancel at any time with no cancellation fees and no questions asked. Your benefits will continue until the end of your current billing period. We\'re confident you\'ll love being a member, but we never want you to feel locked in.'
      },
      {
        question: 'Can I upgrade or downgrade my membership?',
        answer: 'Yes, you can upgrade or downgrade your membership at any time through your account settings. Changes take effect at the start of your next billing period.'
      },
    ]
  },
  {
    category: 'Microgrants',
    questions: [
      {
        question: 'How do microgrants work?',
        answer: 'Contributing and Founding members can apply for microgrants ranging from $100 to $5,000 to help with real-life needs — emergency bills, childcare, medical costs, car repairs, groceries, and more. Applications are short and simple. A real person reviews every application, and most decisions are made within 48 hours. If approved, funds are sent directly to you by bank transfer or digital wallet.'
      },
      {
        question: 'How much can I apply for?',
        answer: 'Microgrants range from $100 to $5,000 depending on your need. Emergency grants ($100–$500) cover urgent everyday needs. Stability grants ($500–$2,500) help with larger expenses like housing deposits or medical bills. Business & growth grants ($2,500–$5,000) support women starting or growing a small business.'
      },
      {
        question: 'How long does the application take?',
        answer: 'The application is short and designed to take just a few minutes. You\'ll share the basics of your situation and what you need support with. No lengthy paperwork, no judgment.'
      },
      {
        question: 'How quickly will I hear back?',
        answer: 'Most applications are reviewed within 48 hours. If approved, funds are typically sent within a few business days. We know that when you need help, you need it fast — that\'s why we\'ve built our process to move quickly.'
      },
      {
        question: 'What if my application is not approved?',
        answer: 'Not every application can be funded in every cycle, but that doesn\'t mean your situation doesn\'t matter. You\'re welcome to apply again in the next grant cycle. We\'re always working to grow our fund so we can help more women.'
      },
    ]
  },
  {
    category: 'Perks & Discounts',
    questions: [
      {
        question: 'What kinds of perks are available?',
        answer: 'Members get access to 1,000+ deals across categories including groceries, health & wellness, childcare, travel, entertainment, insurance, technology, and more. Brands include HelloFresh, ClassPass, Ancestry, Skillshare, Lyft, Care.com, CVS, and many others. New deals are added regularly.'
      },
      {
        question: 'How much can I save with the perks platform?',
        answer: 'Members save an average of $500+ per year through the perks platform. Many members save more than the cost of their annual membership in their very first month. Discounts range from 5% to 60% off depending on the offer.'
      },
      {
        question: 'How do I redeem a perk?',
        answer: 'Browse the perks platform, find an offer you want, and follow the simple redemption instructions. Depending on the offer, you\'ll either click a link, use a code, show a coupon in-store, or call a number. It\'s designed to be quick and easy.'
      },
    ]
  },
  {
    category: 'Zero Dollar Store',
    questions: [
      {
        question: 'What is the Zero Dollar Store?',
        answer: 'The Zero Dollar Store is our free marketplace where members can claim essential items at no cost — hygiene products, household items, and more. Items are restocked regularly. No questions asked, no judgment. It\'s one of our favorite benefits because it meets women exactly where they are.'
      },
      {
        question: 'How often is the Zero Dollar Store restocked?',
        answer: 'The store is restocked regularly with new items. We recommend checking back often so you don\'t miss something you need.'
      },
    ]
  },
  {
    category: 'Privacy & Trust',
    questions: [
      {
        question: 'Is my personal information safe?',
        answer: 'Yes. We take your privacy seriously. Your personal information is never sold to third parties. We use industry-standard security practices to protect your data, and you\'re always in control of what you share.'
      },
      {
        question: 'Do I have to share my income or personal details to join?',
        answer: 'Basic membership requires only your name and email. Some benefits like microgrants may ask for additional context to help us understand your situation and match you with the right support. You\'re always in control of what you share.'
      },
      {
        question: 'Is NFW a nonprofit?',
        answer: 'NFW is a mission-driven organization dedicated to supporting American women. Every membership dollar goes toward funding microgrants, building the perks platform, and advocating for women across the country.'
      },
    ]
  },
]

export const metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about NFW membership, microgrants, perks, and more.',
}

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({ '0-0': true })

  const toggle = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <main className="min-h-screen bg-white">

      {/* HERO */}
      <div className="relative bg-[#2d1239] overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[#fdf493] rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-[#bcafcf] rounded-full opacity-20 blur-3xl"></div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#bcafcf]/20 border border-[#bcafcf]/30 rounded-full text-sm mb-6">
            <span className="w-2 h-2 bg-[#d4f1ad] rounded-full"></span>
            <span className="text-[#fffef1] font-semibold">We&apos;ve got answers</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Questions?
            <br />
            <span className="text-[#fdf493]">We&apos;ve got answers.</span>
          </h1>
          <p className="text-xl text-[#bcafcf] max-w-2xl mx-auto">
            Everything you need to know about NFW membership, microgrants, perks, and more.
          </p>
        </div>
      </div>

      {/* FAQ SECTIONS */}
      <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-15 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-15 blur-3xl"></div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {faqs.map((section, sectionIndex) => (
              <div key={section.category}>
                <h2
                  className="text-2xl font-black text-[#2d1239] mb-6 pb-3 border-b-2 border-[#bcafcf]/30"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {section.category}
                </h2>
                <div className="relative bg-white/60 backdrop-blur-sm rounded-3xl p-6 lg:p-8 border-2 border-[#2d1239]/10 shadow-sm">
                  <div className="space-y-4">
                    {section.questions.map((faq, questionIndex) => {
                      const key = `${sectionIndex}-${questionIndex}`
                      const isOpen = openItems[key]
                      return (
                        <div key={key} className="border-b border-[#2d1239]/10 last:border-b-0">
                          <button
                            onClick={() => toggle(key)}
                            className="w-full flex items-center justify-between py-4 text-left group"
                          >
                            <span className="text-base font-semibold text-[#2d1239] group-hover:text-[#2d1239]/80 transition-colors pr-4">
                              {faq.question}
                            </span>
                            <ChevronDown
                              className={`w-5 h-5 text-[#2d1239] flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                          <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-4' : 'max-h-0'}`}>
                            <p className="text-[#2d1239]/70 leading-relaxed">{faq.answer}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STILL HAVE QUESTIONS */}
      <div className="bg-[#fffef1] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-3xl font-black text-[#2d1239] mb-4"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Still have questions?
          </h2>
          <p className="text-[#2d1239]/60 mb-8 text-lg">
            We&apos;re here to help. Reach out and a real person will get back to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#2d1239] text-[#fffef1] rounded-xl font-bold text-lg hover:bg-[#2d1239]/90 transition-all shadow-lg"
            >
              Contact Us →
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#2d1239] border-2 border-[#2d1239]/20 rounded-xl font-bold text-lg hover:border-[#2d1239] transition-all"
            >
              Join for Free
            </Link>
          </div>
        </div>
      </div>

    </main>
  )
}