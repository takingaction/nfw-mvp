'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'

export default function EverydaySavings() {
  const benefits = [
    'Discounts on groceries, gas, and everyday essentials',
    'Exclusive deals on travel, dining, and entertainment',
    'Savings that add up to hundreds per year'
  ]

  return (
    <div className="relative bg-white py-16 lg:py-24 pb-24 overflow-hidden">      {/* Decorative background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-40 h-40 bg-[#d4f1ad] rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-32 h-32 bg-[#b2d1ee] rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 w-24 h-24 bg-[#fdf493] rounded-full opacity-10 blur-2xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column - Image with Glass Effect */}
          <div className="relative lg:order-1">
            {/* Decorative circles */}
            <div className="absolute -top-8 -left-8 w-32 h-32 bg-[#d4f1ad] rounded-full opacity-60 -z-10"></div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#b2d1ee] rounded-full opacity-40"></div>
            
            {/* Glass card with rotated image */}
            <div className="relative bg-white/20 backdrop-blur-sm rounded-3xl p-4 border-2 border-white/30 shadow-2xl transform -rotate-2 hover:-rotate-2 transition-all duration-500">
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-[#d4f1ad] to-[#b2d1ee]">
                <img
                  src="/images/perks-shopping.jpg"
                  alt="Woman grocery shopping"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Text */}
          <div className="space-y-6 lg:order-2 relative">
            <div className="text-sm font-semibold text-[#2d1239]/60 uppercase tracking-wide">
              Perks and Discounts
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#2d1239] font-neonblitz">
              Everyday savings you can feel
            </h2>
            <p className="text-lg text-[#2d1239]/80">
              Members get access to thousands of discounts on things you already buy. These aren't gimmicks—they're real savings that make your budget stretch further.
            </p>

            {/* Benefits List - TIGHTENED SPACING */}
            <div className="space-y-3 !mt-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-[#d4f1ad] rounded-full flex items-center justify-center mt-0.5 shadow-md">
                    <Check className="w-4 h-4 text-[#2d1239]" />
                  </div>
                  <span className="text-[#2d1239] font-medium">{benefit}</span>
                </div>
              ))}
            </div>

            <Link
              href="/perks"
              className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#d4f1ad] text-[#2d1239] rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#d4f1ad] to-[#b2d1ee] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative">Explore Perks and Discounts →</span>
            </Link>
          </div>
        </div>
      </div>
      {/* Wave Divider at Bottom - Dip in CENTER */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
        <svg className="relative block w-full h-24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M600,112.77C268.63,112.77,0,65.52,0,7.23V120H1200V7.23C1200,65.52,931.37,112.77,600,112.77Z" fill="#BCAFCF"></path>
        </svg>
      </div>
    </div>
  )
}