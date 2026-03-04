import { AuthButton } from './auth-button'
import { Suspense } from 'react'
import NavigationClient from './NavigationClient'
import MobileMenu from './MobileMenu'
import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="w-full bg-[#BCAFCF] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">

          {/* Mobile: Logo centered, Hamburger right */}
          <div className="flex lg:hidden items-center w-full">
            <div className="w-10 flex-shrink-0" />
            <div className="flex-1 flex justify-center">
              <NavigationClient side="center" />
            </div>
            <MobileMenu />
          </div>

          {/* Desktop: 3-column grid for true centering */}
          <div className="hidden lg:grid w-full h-full" style={{ gridTemplateColumns: '1fr auto 1fr' }}>

            {/* Left: nav items — right aligned */}
            <div className="flex items-center justify-end">
              <NavigationClient side="left" />
            </div>

            {/* Center: logo — perfectly centered */}
            <div className="flex items-center justify-center px-8">
              <NavigationClient side="center" />
            </div>

            {/* Right: nav items + auth + donate — right aligned */}
            <div className="flex items-center justify-end gap-4">
              <NavigationClient side="right" />
              <div className="flex items-center gap-3 ml-auto">
                <Suspense fallback={<div className="w-10 h-10 rounded-full bg-[#2d1239]/40" />}>
                  <AuthButton />
                </Suspense>
                <Link
                  href="https://www.zeffy.com/en-US/donation-form/national-fund-for-women-foundation"
                  target="_blank"
                  className="inline-flex items-center justify-center px-4 h-10 bg-[#fdf493] text-[#2d1239] rounded-lg font-bold text-sm hover:bg-[#fdf493]/80 transition-all shadow-sm"
                >
                  Donate
                </Link>
              </div>
            </div>

          </div>

        </div>
      </div>
    </nav>
  )
}