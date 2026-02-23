'use client'

import Link from 'next/link'
import { Gift, Store, Users } from 'lucide-react'

export default function LittleGoesLongWay() {
  const features = [
    {
      icon: Gift,
      title: 'Perks Platform',
      description: 'Save hundreds on everyday purchases with exclusive member discounts',
      color: 'from-[#d4f1ad] to-[#b2d1ee]',
      iconColor: 'text-[#2d1239]'
    },
    {
      icon: Store,
      title: 'Zero Dollar Store',
      description: 'Claim free essentials whenever you need them, no questions asked',
      color: 'from-[#b2d1ee] to-[#bcafcf]',
      iconColor: 'text-[#2d1239]'
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Connect with women who understand your journey and celebrate your wins',
      color: 'from-[#fdf493] to-[#d4f1ad]',
      iconColor: 'text-[#2d1239]'
    }
  ]

  return (
    <div className="relative bg-white py-16 lg:pt-24 pb-40 overflow-hidden">
      {/* Decorative background blurs - NO ANIMATION */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-15 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-[#d4f1ad] to-[#b2d1ee] rounded-full opacity-15 blur-3xl"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-10 blur-2xl"></div>
      </div>

      {/* Gradient overlay in corners */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#fdf493]/5 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#d4f1ad]/5 to-transparent pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#2d1239] mb-6 font-neonblitz leading-tight">
            A little goes a<br className="hidden sm:block" /> long way
          </h2>
          <p className="text-xl text-[#2d1239]/80 mb-8">
            Support that feels good & does good.
          </p>
          <p className="text-lg text-[#2d1239]/70 mb-8 max-w-2xl mx-auto">
            Membership means getting help when you need it, on your terms. You control what benefits you use and when, no pressure, no judgment.
          </p>
          <Link
            href="/auth/signup"
            className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative">Become a Member</span>
          </Link>
        </div>

        {/* Glass Card Container */}
        <div className="relative">
          {/* Large decorative circles around glass card - NO ANIMATION */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-40"></div>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-40"></div>
          <div className="absolute top-1/2 -right-16 w-20 h-20 bg-gradient-to-br from-[#d4f1ad] to-[#b2d1ee] rounded-full opacity-30"></div>
          <div className="absolute -top-4 right-1/4 w-16 h-16 bg-gradient-to-br from-[#fdf493] to-[#bcafcf] rounded-full opacity-35"></div>
          <div className="absolute bottom-1/3 -left-8 w-14 h-14 bg-gradient-to-br from-[#b2d1ee] to-[#d4f1ad] rounded-full opacity-30"></div>

          {/* Glass Card - WITH ROTATION ANIMATION */}
          <div className="relative bg-white/40 backdrop-blur-md rounded-3xl p-8 lg:p-12 border-2 border-white/50 shadow-2xl transform rotate-1 hover:rotate-1 transition-all duration-500">
            {/* Subtle gradient overlay inside glass card */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#fffef1]/10 via-transparent to-[#b2d1ee]/10 rounded-3xl pointer-events-none"></div>
            
            {/* Decorative corner accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full -mr-12 -mt-12"></div>
            
            {/* Features Grid */}
            <div className="relative grid md:grid-cols-3 gap-8 lg:gap-12">
              {features.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <div key={index} className="text-center group">
                    <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${feature.color} rounded-full mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
                      <IconComponent className={`w-10 h-10 ${feature.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-[#2d1239] mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-[#2d1239]/70">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating accent shapes - NO ANIMATION */}
      <div className="absolute top-10 right-10 w-16 h-16 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-30"></div>
      <div className="absolute bottom-32 left-20 w-12 h-12 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-30"></div>
      <div className="absolute top-1/3 left-10 w-14 h-14 bg-gradient-to-br from-[#d4f1ad] to-[#b2d1ee] rounded-full opacity-25"></div>

      {/* Wave Divider at Bottom */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
        <svg className="relative block w-full h-24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" fill="#BCAFCF"></path>
        </svg>
      </div>
    </div>
  )
}