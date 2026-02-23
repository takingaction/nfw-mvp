import { AuthButton } from './auth-button'
import { Suspense } from 'react'
import NavigationClient from './NavigationClient'
import MobileMenu from './MobileMenu'

export default function Navigation() {
  return (
    <nav className="w-full bg-[#BCAFCF] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Mobile: Logo centered, Hamburger right */}
          <div className="flex lg:hidden items-center justify-between w-full">
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

            {/* Auth Button - Far right */}
            <div className="absolute right-4">
              <Suspense>
                <AuthButton />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}