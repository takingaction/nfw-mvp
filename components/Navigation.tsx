import { AuthButton } from './auth-button'
import { Suspense } from 'react'
import NavigationClient from './NavigationClient'
import MobileMenu from './MobileMenu'
import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="w-full bg-[#BCAFCF] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20">

          {/* Mobile: Logo centered, Hamburger right */}
          <div className="flex lg:hidden items-center w-full">
            <div className="w-10 flex-shrink-0" />
            <div className="flex-1 flex justify-center">
              <NavigationClient side="center" />
            </div>
            <MobileMenu />
          </div>

          {/* Desktop: Auth+Donate fixed right, everything else centered */}
          <div className="hidden lg:flex items-center w-full">

            {/* Auth + Donate — fixed to far right */}
            <div className="flex items-center gap-3 ml-auto order-last">
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

            {/* Nav + Logo — centered in remaining space */}
            <div className="flex-1 flex items-center justify-center gap-12">
              <NavigationClient side="left" />
              <NavigationClient side="center" />
              <NavigationClient side="right" />
            </div>

          </div>

        </div>
      </div>
    </nav>
  )
}