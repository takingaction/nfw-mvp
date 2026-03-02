'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

interface NavigationClientProps {
  side: 'left' | 'right' | 'center'
}

export default function NavigationClient({ side }: NavigationClientProps) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const [membershipOpen, setMembershipOpen] = useState(false)
  const [programsOpen, setProgramsOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)

  const dropdownClass = "w-48 bg-white rounded-lg shadow-xl py-2 border border-[#BCAFCF]/20"
  const linkClass = "block px-4 py-2 text-[#2d1239] hover:bg-[#BCAFCF]/10 transition-colors"
  const buttonClass = "flex items-center gap-1 text-[#2d1239] font-semibold hover:text-[#2d1239]/80 transition-colors py-6"

  // Center Logo
  if (side === 'center') {
    return (
      <Link href="/" className="inline-block flex-shrink-0">
        <img
          src="/images/header-logo.png"
          alt="NFW Logo"
          className="h-[72px] w-auto"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const parent = e.currentTarget.parentElement
            if (parent) {
              parent.innerHTML = '<span class="text-2xl font-black font-bold text-[#2d1239]">NFW</span>'
            }
          }}
        />
      </Link>
    )
  }

  // Left Menu
  if (side === 'left') {
    return (
      <div className="flex items-center gap-6">

        {/* About Dropdown */}
        <div className="relative">
          <button
            onMouseEnter={() => setAboutOpen(true)}
            onMouseLeave={() => setAboutOpen(false)}
            className={buttonClass}
          >
            About
            <ChevronDown className="w-4 h-4" />
          </button>
          {aboutOpen && (
            <div
              onMouseEnter={() => setAboutOpen(true)}
              onMouseLeave={() => setAboutOpen(false)}
              className="absolute top-full left-0 pt-0"
            >
              <div className={dropdownClass}>
                <Link href="/about" prefetch={false} className={linkClass}>About Us</Link>
              </div>
            </div>
          )}
        </div>

        {/* Membership Dropdown */}
        <div className="relative">
          <button
            onMouseEnter={() => setMembershipOpen(true)}
            onMouseLeave={() => setMembershipOpen(false)}
            className={buttonClass}
          >
            Membership
            <ChevronDown className="w-4 h-4" />
          </button>
          {membershipOpen && (
            <div
              onMouseEnter={() => setMembershipOpen(true)}
              onMouseLeave={() => setMembershipOpen(false)}
              className="absolute top-full left-0 pt-0"
            >
              <div className={dropdownClass}>
                <Link href="/pricing" className={linkClass}>Membership</Link>
                <Link href="/auth/sign-up" className={linkClass}>Become a Member</Link>
                <Link href="/dashboard" className={linkClass}>Member Portal</Link>
              </div>
            </div>
          )}
        </div>

      </div>
    )
  }

  // Right Menu
  return (
    <div className="flex items-center gap-6">

      {/* Our Programs Dropdown */}
      <div className="relative">
        <button
          onMouseEnter={() => setProgramsOpen(true)}
          onMouseLeave={() => setProgramsOpen(false)}
          className={buttonClass}
        >
          Our Programs
          <ChevronDown className="w-4 h-4" />
        </button>
        {programsOpen && (
          <div
            onMouseEnter={() => setProgramsOpen(true)}
            onMouseLeave={() => setProgramsOpen(false)}
            className="absolute top-full right-0 pt-0"
          >
            <div className={dropdownClass}>
              <Link href="/grants" className={linkClass}>Microgrants</Link>
              <Link href="/perks/info" className={linkClass}>Perks</Link>
              <Link href="/store/info" className={linkClass}>Zero Dollar Store</Link>
              <Link href="/articles" className={linkClass}>Articles</Link>
            </div>
          </div>
        )}
      </div>

      {/* Support Dropdown */}
      <div className="relative">
        <button
          onMouseEnter={() => setSupportOpen(true)}
          onMouseLeave={() => setSupportOpen(false)}
          className={buttonClass}
        >
          Support
          <ChevronDown className="w-4 h-4" />
        </button>
        {supportOpen && (
          <div
            onMouseEnter={() => setSupportOpen(true)}
            onMouseLeave={() => setSupportOpen(false)}
            className="absolute top-full right-0 pt-0"
          >
            <div className={dropdownClass}>
              <Link href="/contact" className={linkClass}>Contact Support</Link>
              <Link href="/faq" className={linkClass}>FAQs</Link>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}