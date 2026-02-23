'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      question: 'How much does membership cost?',
      answer: 'Membership is just $9.99 per month or $99 per year. This gives you access to all our benefits including microgrants, perks, the Zero Dollar Store, and our community.'
    },
    {
      question: 'How do microgrants work?',
      answer: 'Members can apply for microgrants up to $1,000 to help with unexpected expenses. Applications are reviewed within 48 hours, and approved funds are sent directly to your bank account.'
    },
    {
      question: 'What is the Zero Dollar Store?',
      answer: 'The Zero Dollar Store is our free marketplace where members can claim essential items at no cost. Items are restocked regularly and include hygiene products, household items, and more.'
    },
    {
      question: 'Who is eligible to join?',
      answer: 'NFW membership is open to all women 18 and older residing in the United States. We welcome women from all backgrounds and circumstances.'
    },
    {
      question: 'Can I cancel my membership anytime?',
      answer: 'Yes! You can cancel your membership at any time with no cancellation fees. Your benefits will continue until the end of your current billing period.'
    }
  ]

  return (
    <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-[#d4f1ad] to-[#b2d1ee] rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-15 blur-2xl"></div>
      </div>

      {/* Floating accent circles */}
      <div className="absolute top-16 right-16 w-20 h-20 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-40 animate-float"></div>
      <div className="absolute bottom-32 left-12 w-16 h-16 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-40 animate-float" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/3 left-8 w-12 h-12 bg-gradient-to-br from-[#d4f1ad] to-[#b2d1ee] rounded-full opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-1/4 right-8 w-14 h-14 bg-gradient-to-br from-[#fdf493] to-[#bcafcf] rounded-full opacity-35 animate-float" style={{ animationDelay: '1.5s' }}></div>

      {/* Gradient overlays in corners */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#fdf493]/5 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#b2d1ee]/5 to-transparent pointer-events-none"></div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#2d1239] mb-6 font-neonblitz">
            Questions? We've got answers.
          </h2>
          <p className="text-lg text-[#2d1239]/70 max-w-2xl mx-auto">
            Everything you need to know about NFW membership.
          </p>
        </div>

        {/* FAQ Accordion with Glass Effect */}
        <div className="relative">
          {/* Decorative circle behind accordion */}
          <div className="absolute -top-8 -left-8 w-24 h-24 bg-gradient-to-br from-[#d4f1ad] to-[#b2d1ee] rounded-full opacity-30"></div>
          <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-30"></div>

          <div className="relative bg-white/60 backdrop-blur-sm rounded-3xl p-6 lg:p-8 border-2 border-white/50 shadow-xl">
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="border-b border-[#2d1239]/10 last:border-b-0"
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full flex items-center justify-between py-4 text-left group"
                  >
                    <span className="text-lg font-semibold text-[#2d1239] group-hover:text-[#2d1239]/80 transition-colors pr-4">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#2d1239] flex-shrink-0 transition-transform duration-300 ${
                        openIndex === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openIndex === index ? 'max-h-96 pb-4' : 'max-h-0'
                    }`}
                  >
                    <p className="text-[#2d1239]/70 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}