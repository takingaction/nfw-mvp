'use client'

import { DollarSign, Gift, ShoppingBag, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function WhatWeOffer() {
  const offerings = [
    {
      icon: DollarSign,
      title: 'Microgrants',
      description: 'Apply for direct financial assistance up to $1,000. Get help when you need it most.',
      bgColor: 'bg-[#d4f1ad]',
      textColor: 'text-[#2d1239]',
      link: '/grants',
      linkText: 'Apply for a Grant'
    },
    {
  icon: Gift,
  title: 'Perks & Discounts',
  description: 'Everyday savings you can feel—groceries, gas, childcare, and more. Save hundreds with exclusive member discounts from top brands.',
  bgColor: 'bg-[#fdf493]',
  textColor: 'text-[#2d1239]',
  link: '/perks',
  linkText: 'Browse Perks'
},
    {
      icon: ShoppingBag,
      title: 'Zero Dollar Store',
      description: 'Get free essentials for you and your family. No strings attached, just support.',
      bgColor: 'bg-[#b2d1ee]',
      textColor: 'text-[#2d1239]',
      link: '/store',
      linkText: 'Shop the Store'
    },
    {
      icon: Users,
      title: 'Events & Community',
      description: 'Connect with other members, attend events, and be part of a supportive community.',
      bgColor: 'bg-[#bcafcf]',
      textColor: 'text-[#2d1239]',
      link: '/events',
      linkText: 'Join the Community'
    }
  ]

  return (
    <div className="bg-[#fffef1] py-20 lg:py-32 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-[#fdf493] rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-40 h-40 bg-[#bcafcf] rounded-full opacity-20 blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2d1239]/10 rounded-full text-sm font-semibold text-[#2d1239] mb-4">
            What We Offer
          </div>
          {/* Section Headline - NEONBLITZ FONT */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#2d1239] mb-6 font-neonblitz">
            Small wins that add up to
            <br />
            <span className="text-[#2d1239]/60">big support.</span>
          </h2>
          <p className="text-xl text-[#2d1239]/70 max-w-3xl mx-auto">
            From direct grants to everyday savings, we're here to make your life a little easier.
          </p>
        </div>

        {/* Grid Layout - Full Width */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-16">
          {offerings.map((offering, index) => {
            const IconComponent = offering.icon
            return (
              <div
                key={index}
                className="transform transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`${offering.bgColor} rounded-3xl p-8 lg:p-10 shadow-xl hover:shadow-2xl transition-shadow duration-300 h-full relative overflow-hidden group`}>
                  {/* Decorative corner accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16"></div>
                  
                  <div className="relative">
                    {/* Icon */}
                    <div className="w-16 h-16 bg-white/50 rounded-2xl flex items-center justify-center mb-6">
                      <IconComponent className={`w-8 h-8 ${offering.textColor}`} />
                    </div>

                    {/* Card Title - NEONBLITZ FONT */}
                    <h3 className={`text-3xl lg:text-4xl font-black ${offering.textColor} mb-4 font-neonblitz`}>
                      {offering.title}
                    </h3>
                    <p className={`text-lg ${offering.textColor}/80 mb-6 leading-relaxed`}>
                      {offering.description}
                    </p>

                    {/* CTA Link */}
                    <Link
                      href={offering.link}
                      className={`inline-flex items-center gap-2 ${offering.textColor} font-bold text-lg group-hover:gap-3 transition-all`}
                    >
                      {offering.linkText}
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <p className="text-[#2d1239]/70 text-lg mb-6">
            Ready to experience all these benefits?
          </p>
          <Link
            href="/auth/signup"
            className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#2d1239] text-white rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#2d1239] to-[#4a1f5c] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative">Become a Member Today</span>
          </Link>
        </div>
      </div>
    </div>
  )
}