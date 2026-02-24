'use client'

import Link from 'next/link'

export default function SmallWins() {
  return (
    <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-40 h-40 bg-[#fdf493] rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-[#bcafcf] rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-[#d4f1ad] rounded-full opacity-10 blur-2xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column - Text */}
          <div className="space-y-6">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#2d1239] font-bold">
              Small wins matter. Let's celebrate yours.
            </h2>
            <p className="text-lg text-[#2d1239]/80">
              Stories, joy, and tiny moments of relief. Every day.
            </p>
            <Link
              href="/auth/sign-up"
              className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative">Become a Member →</span>
            </Link>
          </div>

          {/* Right Column - Photo Collage with Glass Effects */}
          <div className="relative">
            {/* Photo grid - polaroid style with glass effects */}
            <div className="grid grid-cols-2 gap-4">
              {/* Photo 1 */}
              <div className="relative bg-white/40 backdrop-blur-sm p-3 shadow-lg transform rotate-2 hover:rotate-2 transition-transform border-2 border-white/50">
                <div className="aspect-square bg-gradient-to-br from-[#bcafcf] to-[#fdf493] rounded">
                  <img
                    src="/images/member-1.jpg"
                    alt="NFW Member"
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Photo 2 */}
              <div className="relative bg-white/40 backdrop-blur-sm p-3 shadow-lg transform -rotate-1 hover:-rotate-1 transition-transform mt-8 border-2 border-white/50">
                <div className="aspect-square bg-gradient-to-br from-[#d4f1ad] to-[#b2d1ee] rounded">
                  <img
                    src="/images/member-2.jpg"
                    alt="NFW Member"
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Photo 3 */}
              <div className="relative bg-white/40 backdrop-blur-sm p-3 shadow-lg transform -rotate-2 hover:-rotate-2 transition-transform -mt-4 border-2 border-white/50">
                <div className="aspect-square bg-gradient-to-br from-[#fdf493] to-[#bcafcf] rounded">
                  <img
                    src="/images/member-3.jpg"
                    alt="NFW Member"
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Photo 4 */}
              <div className="relative bg-white/40 backdrop-blur-sm p-3 shadow-lg transform rotate-1 hover:rotate-1 transition-transform border-2 border-white/50">
                <div className="aspect-square bg-gradient-to-br from-[#b2d1ee] to-[#d4f1ad] rounded">
                  <img
                    src="/images/member-4.jpg"
                    alt="NFW Member"
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#fdf493] rounded-full opacity-40 -z-10"></div>
            <div className="absolute -top-4 -left-4 w-16 h-16 bg-[#b2d1ee] rounded-full opacity-40"></div>
          </div>
        </div>
      </div>

      {/* Floating accent shapes */}
      <div className="absolute top-10 right-1/4 w-12 h-12 bg-[#fdf493] rounded-full opacity-30"></div>
      <div className="absolute bottom-20 left-10 w-16 h-16 bg-[#bcafcf] rounded-full opacity-30"></div>
    </div>
  )
}