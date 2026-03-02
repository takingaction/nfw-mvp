import { AuthButton } from './auth-button'
import { Suspense } from 'react'
import NavigationClient from './NavigationClient'
import MobileMenu from './MobileMenu'
import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="w-full bg-[#BCAFCF] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Mobile: Logo centered, Hamburger right */}
          <div className="flex lg:hidden items-center w-full">
            <div className="w-10 flex-shrink-0" />
            <div className="flex-1 flex justify-center">
              <NavigationClient side="center" />
            </div>
            <MobileMenu />
          </div>

          {/* Desktop: Centered layout with items close to logo */}
          <div className="hidden lg:flex items-center justify-center w-full gap-12">
            {/* Left Menu Items */}
            <NavigationClient side="left" />

            {/* Center Logo */}
            <NavigationClient side="center" />

            {/* Right Menu Items */}
            <NavigationClient side="right" />

            {/* Auth + Donate — Far right */}
            <div className="absolute right-4 flex items-center gap-3">
              <Suspense fallback={<div className="w-10 h-10 rounded-full bg-[#2d1239]/40" />}>
                <AuthButton />
              </Suspense>
              <Link
                href="https://www.zeffy.com/en-US/donation-form/national-fund-for-women-foundation"
                target="_blank"
                className="inline-flex items-center justify-center px-4 py-2 bg-[#fdf493] text-[#2d1239] rounded-lg font-bold text-sm hover:bg-[#fdf493]/80 transition-all shadow-sm h-10"
              >
                Donate
              </Link>
            </div>
          </div>

        </div>
      </div>
    </nav>
  )
}