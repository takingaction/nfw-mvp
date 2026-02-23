'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [membershipOpen, setMembershipOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => {
    setIsOpen(false)
    setAboutOpen(false)
    setMembershipOpen(false)
    setCommunityOpen(false)
    setAuthOpen(false)
  }

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, is_admin')
          .eq('id', user.id)
          .single()
        
        setProfile(profileData)
        setIsAdmin(profileData?.is_admin || false)
      }
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const firstLetter = profile?.full_name 
    ? profile.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U'

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="p-2 text-[#2d1239] hover:bg-white/10 rounded-lg transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={closeMenu}
        />
      )}

      {/* Slide-out Menu - Dark Purple Background */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-[#2d1239] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span className="text-xl font-black font-neonblitz text-white">Menu</span>
            <button
              onClick={closeMenu}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-2">
              {/* About Dropdown */}
              <div>
                <button
                  onClick={() => setAboutOpen(!aboutOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-white font-semibold hover:bg-white/10 rounded-lg transition-colors"
                >
                  About
                  <ChevronDown className={`w-4 h-4 transition-transform ${aboutOpen ? 'rotate-180' : ''}`} />
                </button>
                {aboutOpen && (
                  <div className="ml-4 mt-2 space-y-1">
                    <Link
                      href="/about"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Our Story
                    </Link>
                    <Link
                      href="/mission"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Mission & Values
                    </Link>
                    <Link
                      href="/team"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Our Team
                    </Link>
                    <Link
                      href="/contact"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Contact Us
                    </Link>
                  </div>
                )}
              </div>

              {/* Membership Dropdown */}
              <div>
                <button
                  onClick={() => setMembershipOpen(!membershipOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-white font-semibold hover:bg-white/10 rounded-lg transition-colors"
                >
                  Membership
                  <ChevronDown className={`w-4 h-4 transition-transform ${membershipOpen ? 'rotate-180' : ''}`} />
                </button>
                {membershipOpen && (
                  <div className="ml-4 mt-2 space-y-1">
                    <Link
                      href="/auth/signup"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Join Now
                    </Link>
                    <Link
                      href="/membership"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Benefits
                    </Link>
                    <Link
                      href="/pricing"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Pricing
                    </Link>
                  </div>
                )}
              </div>

              {/* Community Dropdown */}
              <div>
                <button
                  onClick={() => setCommunityOpen(!communityOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-white font-semibold hover:bg-white/10 rounded-lg transition-colors"
                >
                  Community
                  <ChevronDown className={`w-4 h-4 transition-transform ${communityOpen ? 'rotate-180' : ''}`} />
                </button>
                {communityOpen && (
                  <div className="ml-4 mt-2 space-y-1">
                    <Link
                      href="/articles"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Articles
                    </Link>
                    <Link
                      href="/grants"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Microgrants
                    </Link>
                    <Link
                      href="/perks"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Perks & Discounts
                    </Link>
                    <Link
                      href="/store"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Zero Dollar Store
                    </Link>
                    <Link
                      href="/events"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Events
                    </Link>
                  </div>
                )}
              </div>

              {/* Donate Link */}
              <Link
                href="/donate"
                onClick={closeMenu}
                className="block px-4 py-3 text-white font-semibold hover:bg-white/10 rounded-lg transition-colors"
              >
                Donate
              </Link>
            </nav>
          </div>

          {/* Footer - Auth Section */}
          <div className="p-4 border-t border-white/10">
            {user ? (
              <div>
                {/* User Avatar Button */}
                <button
                  onClick={() => setAuthOpen(!authOpen)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#BCAFCF] text-[#2d1239] font-bold text-lg flex items-center justify-center">
                    {firstLetter}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-white/60">{user.email}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-white transition-transform ${authOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Auth Dropdown */}
                {authOpen && (
                  <div className="mt-2 space-y-1">
                    <Link
                      href="/dashboard"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      My Profile
                    </Link>
                    <Link
                      href="/grants/my-applications"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      My Grants
                    </Link>

                    {/* Admin Links */}
                    {isAdmin && (
                      <>
                        <div className="border-t border-white/10 my-2"></div>
                        <p className="px-4 py-1 text-xs font-semibold text-white/60 uppercase">Admin</p>
                        <Link
                          href="/admin/grants"
                          onClick={closeMenu}
                          className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          Manage Grants
                        </Link>
                        <Link
                          href="/admin/articles"
                          onClick={closeMenu}
                          className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          Manage Articles
                        </Link>
                        <Link
                          href="/admin/members"
                          onClick={closeMenu}
                          className="block px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          Manage Members
                        </Link>
                      </>
                    )}

                    {/* Logout */}
                    <div className="border-t border-white/10 my-2"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/auth/login"
                  onClick={closeMenu}
                  className="block w-full text-center px-4 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={closeMenu}
                  className="block w-full text-center px-4 py-2 bg-[#fdf493] text-[#2d1239] rounded-lg font-semibold hover:bg-[#fdf493]/90 transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}