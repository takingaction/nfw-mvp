import { Suspense } from 'react'
import NavigationClient from './NavigationClient'
import MobileMenu from './MobileMenu'
import { AuthButton } from './auth-button'
import { createClient } from '@/lib/supabase/server'

export default async function Navigation() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, is_admin')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <nav className="w-full bg-[#BCAFCF] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Mobile */}
          <div className="flex lg:hidden items-center justify-between w-full">
            <div className="flex-1 flex justify-center">
              <NavigationClient side="center" />
            </div>
            <MobileMenu />
          </div>

          {/* Desktop */}
          <div className="hidden lg:flex items-center justify-center w-full gap-12">
            <NavigationClient side="left" />
            <NavigationClient side="center" />
            <NavigationClient side="right" />
            <div className="absolute right-4">
              <Suspense fallback={<div className="w-10 h-10 rounded-full bg-[#2d1239]/20" />}>
                <AuthButton user={user} profile={profile} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}