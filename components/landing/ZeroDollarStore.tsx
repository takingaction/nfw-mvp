'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'

export default function ZeroDollarStore() {
  const benefits = [
    'Hygiene products, household items, and more',
    'No purchase required—just claim what you need',
    'Restocked regularly with new items'
  ]

  return (
    <div className="relative bg-[#BCAFCF] py-16 lg:py-24 pb-24 overflow-hidden">      {/* Decorative background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-40 h-40 bg-[#b2d1ee] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-white rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute top-2/3 right-1/3 w-24 h-24 bg-[#fdf493] rounded-full opacity-10 blur-2xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column - Text */}
          <div className="space-y-6 relative">
            <div className="text-sm font-semibold text-[#2d1239]/60 uppercase tracking-wide">
              Zero Dollar Store
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#2d1239] font-neonblitz">
              Free items you can claim anytime
            </h2>
            <p className="text-lg text-[#2d1239]/80">
              Sometimes you just need a little something to get by. Our Zero Dollar Store lets you claim free essentials whenever you need them - no questions, no judgment.
            </p>

            {/* Benefits List - TIGHTENED SPACING */}
            <div className="space-y-3 !mt-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-[#b2d1ee] rounded-full flex items-center justify-center mt-0.5 shadow-md">
                    <Check className="w-4 h-4 text-[#2d1239]" />
                  </div>
                  <span className="text-[#2d1239] font-medium">{benefit}</span>
                </div>
              ))}
            </div>

            <Link
              href="/store"
              className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#b2d1ee] text-[#2d1239] rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#b2d1ee] to-[#bcafcf] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative">See the Zero Dollar Store →</span>
            </Link>
          </div>

          {/* Right Column - Image with Glass Effect */}
          <div className="relative">
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#b2d1ee] rounded-full opacity-60 -z-10"></div>
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white rounded-full opacity-40"></div>
            
            {/* Glass card with rotated image */}
            <div className="relative bg-white/20 backdrop-blur-sm rounded-3xl p-4 border-2 border-white/30 shadow-2xl transform rotate-2 hover:rotate-2 transition-all duration-500">
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf]">
                <img
                  src="/images/zero-dollar-store.jpg"
                  alt="Woman browsing items on laptop"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating accent shapes */}
      <div className="absolute top-1/4 right-10 w-16 h-16 bg-[#b2d1ee] rounded-full opacity-30"></div>
      <div className="absolute bottom-10 left-1/4 w-12 h-12 bg-white rounded-full opacity-20"></div>
      {/* Wave Divider at Bottom */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
        <svg className="relative block w-full h-24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" fill="white"></path>
        </svg>
      </div>
    </div>
  )
}