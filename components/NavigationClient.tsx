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
  const [communityOpen, setCommunityOpen] = useState(false)

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
            className="flex items-center gap-1 text-[#2d1239] font-semibold hover:text-[#2d1239]/80 transition-colors py-6"
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
              <div className="w-48 bg-white rounded-lg shadow-xl py-2 border border-[#BCAFCF]/20">
                <Link href="/about" prefetch={false} className="block px-4 py-2 text-[#2d1239] hover:bg-[#BCAFCF]/10 transition-colors">
                  Our Story
                </Link>
                <Link href="/mission" className="block px-4 py-2 text-[#2d1239] hover:bg-[#BCAFCF]/10 transition-colors">
                  Mission & Values
                </Link>
                <Link href="/team" className="block px-4 py-2 text-[#2d1239] hover:bg-[#BCAFCF]/10 transition-colors">
                  Our Team
                </Link>
                <Link href="/contact" className="block px-4 py-2 text-[#2d1239] hover:bg-[#BCAFCF]/10 transition-colors">
                  Contact Us
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Membership Dropdown */}
        <div className="relative">
          <button
            onMouseEnter={() => setMembershipOpen(true)}
            onMouseLeave={() => setMembershipOpen(false)}
            className="flex items-center gap-1 text-[#2d1239] font-semibold hover:text-[#2d1239]/80 transition-colors py-6"
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
              <div className="w-48 bg-white rounded-lg shadow-xl py-2 border border-[#BCAFCF]/20">
                <Link href="/auth/sign-up" className="block px-4 py-2 text-[#2d1239] hover:bg-[#BCAFCF]/10 transition-colors">
                  Join Now
                </Link>
                <Link href="/membership" className="block px-4 py-2 text-[#2d1239] hover:bg-[#BCAFCF]/10 transition-colors">
                  Benefits
                </Link>
                <Link href="/pricing" className="block px-4 py-2 text-[#2d1239] hover:bg-[#BCAFCF]/10 transition-colors">
                  Pricing
                </Link>
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
      {/* Community Dropdown - ADDED ARTICLES */}
      <div className="relative">
        <button
          onMouseEnter={() => setCommunityOpen(true)}
          onMouseLeave={() => setCommunityOpen(false)}
          className="flex items-center gap-1 text-[#2d1239] font-semibold hover:text-[#2d1239]/80 transition-colors py-6"
        >
          Community
          <ChevronDown className="w-4 h-4" />
        </button>
        {communityOpen && (
          <div
            onMouseEnter={() => setCommunityOpen(true)}
            onMouseLeave={() => setCommunityOpen(false)}
            className="absolute top-full right-0 pt-0"
          >
            <div className="w-48 bg-white rounded-lg shadow-xl py-2 border border-[#BCAFCF]/20">
              <Link href="/articles" className="block px-4 py-2 text-[#2d1239] hover:bg-[#BCAFCF]/10 transition-colors">
                Articles
              </Link>
              <Link href="/grants" className="block px-4 py-2 text-[#2d1239] hover:bg-[#BCAFCF]/10 transition-colors">
                Microgrants
              </Link>
              <Link href="/perks" className="block px-4 py-2 text-[#2d1239] hover:bg-[#BCAFCF]/10 transition-colors">
                Perks & Discounts
              </Link>
              <Link href="/store" className="block px-4 py-2 text-[#2d1239] hover:bg-[#BCAFCF]/10 transition-colors">
                Zero Dollar Store
              </Link>
              <Link href="/events" className="block px-4 py-2 text-[#2d1239] hover:bg-[#BCAFCF]/10 transition-colors">
                Events
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Donate Link */}
      <Link
        href="https://www.zeffy.com/en-US/donation-form/national-fund-for-women-foundation" target="_blank"
        className="text-[#2d1239] font-semibold hover:text-[#2d1239]/80 transition-colors"
      >
        Donate
      </Link>
    </div>
  )
}