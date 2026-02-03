'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type UserProfile = {
  full_name: string
  is_admin: boolean
  membership_level: string
}

export default function Navigation() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        // Fetch profile
        supabase
          .from('profiles')
          .select('full_name, is_admin, membership_level')
          .eq('id', user.id)
          .single()
          .then(({ data }) => setProfile(data))
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from('profiles')
          .select('full_name, is_admin, membership_level')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setProfile(data))
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const isActive = (path: string) => pathname === path

  // Don't show navigation on auth pages
  if (pathname?.startsWith('/auth/')) {
    return null
  }

const mainNavItems = [
  { href: '/', label: 'Home' },
  { href: '/store', label: 'Zero Dollar Store' },
  { href: '/articles', label: 'Articles' },  // ← Make sure this is here
  { href: '/microgrants', label: 'Microgrants' },
  { href: '/perks', label: 'Member Perks' },
  { href: '/about', label: 'About' },
]

  const userNavItems = user ? [
    { href: '/profile', label: 'My Profile' },
    { href: '/store/my-claims', label: 'My Claims' },
    { href: '/microgrants/my-applications', label: 'My Applications' },
  ] : []

const adminNavItems = profile?.is_admin ? [
  { href: '/admin/articles', label: 'Manage Articles' },  // ← Add this
  { href: '/admin/claims', label: 'Manage Claims' },
  { href: '/admin/items', label: 'Manage Items' },
  { href: '/admin/microgrants', label: 'Manage Microgrants' },
  { href: '/admin/members', label: 'Manage Members' },
] : []

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Main Nav */}
          <div className="flex">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">NFW</span>
            </Link>

            {/* Desktop Main Navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-4">
              {mainNavItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive(item.href)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side - User Menu */}
          <div className="flex items-center">
            {user ? (
              <div className="relative">
                {/* User Menu Button */}
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700">
                    {profile?.full_name || 'User'}
                  </span>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    
                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b">
                        <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{profile?.membership_level} Member</p>
                      </div>

                      {/* User Links */}
                      <div className="py-1">
                        {userNavItems.map(item => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setShowUserMenu(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>

                      {/* Admin Links */}
                      {adminNavItems.length > 0 && (
                        <>
                          <div className="border-t">
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                              Admin
                            </div>
                            {adminNavItems.map(item => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setShowUserMenu(false)}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Sign Out */}
                      <div className="border-t py-1">
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden ml-2 p-2 rounded-md text-gray-700 hover:bg-gray-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t py-2">
            {mainNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMobileMenu(false)}
                className={`block px-4 py-2 text-sm font-medium rounded-md ${
                  isActive(item.href)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}



