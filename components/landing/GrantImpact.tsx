'use client'

import { Home, Car, Baby, Heart } from 'lucide-react'

export default function GrantImpact() {
  const impacts = [
    {
      icon: Home,
      title: 'Covered rent for 1 month',
      description: 'Keep a roof over your family\'s head during tough times',
      bgColor: 'bg-[#d4f1ad]',
      iconColor: 'text-[#2d1239]'
    },
    {
      icon: Car,
      title: 'Fixed car to get to work',
      description: 'Repair your vehicle so you can keep earning',
      bgColor: 'bg-[#fdf493]',
      iconColor: 'text-[#2d1239]'
    },
    {
      icon: Baby,
      title: 'Childcare for 2 weeks',
      description: 'Safe care for your kids while you work or interview',
      bgColor: 'bg-[#b2d1ee]',
      iconColor: 'text-[#2d1239]'
    },
    {
      icon: Heart,
      title: 'Medical bill paid',
      description: 'Clear unexpected healthcare costs and reduce stress',
      bgColor: 'bg-[#bcafcf]',
      iconColor: 'text-[#2d1239]'
    }
  ]

  return (
    <div className="bg-[#fffef1] py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2d1239]/10 rounded-full text-sm font-semibold text-[#2d1239] mb-4">
            Grant Impact
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#2d1239] mb-6 font-neonblitz">
            What $1,000 can do
            <br />
            <span className="text-[#2d1239]/60">for real women.</span>
          </h2>
          <p className="text-xl text-[#2d1239]/70 max-w-3xl mx-auto">
            Our microgrants aren't just numbers—they're lifelines that solve real problems.
          </p>
        </div>

        {/* Impact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {impacts.map((impact, index) => {
            const IconComponent = impact.icon
            return (
              <div
                key={index}
                className="group relative overflow-hidden"
              >
                <div className={`${impact.bgColor} rounded-3xl p-8 lg:p-10 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}>
                  {/* Icon */}
                  <div className="w-20 h-20 bg-white/50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className={`w-10 h-10 ${impact.iconColor}`} />
                  </div>

                  {/* Content */}
                  <h3 className={`text-2xl lg:text-3xl font-black ${impact.iconColor} mb-3 font-neonblitz`}>
                    {impact.title}
                  </h3>
                  <p className={`text-lg ${impact.iconColor}/80 leading-relaxed`}>
                    {impact.description}
                  </p>

                  {/* Decorative element */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16"></div>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-[#2d1239]/70 text-lg mb-6">
            Ready to apply for a grant that could change your life?
          </p>
          <a
            href="/grants"
            className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#2d1239] text-white rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#2d1239] to-[#4a1f5c] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative">Apply for a Microgrant</span>
          </a>
        </div>
      </div>
    </div>
  )
}