'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const AuthContext = createContext<{
  user: any
  profile: any
  isAdmin: boolean
  loading: boolean
}>({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true
})

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('full_name, is_admin')
        .eq('id', userId)
        .single()
      setProfile(data)
      setIsAdmin(data?.is_admin || false)
    } catch (e) {
      console.error('Profile fetch error:', e)
    }
  }

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user ?? null)
      if (user) await fetchProfile(user.id)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          await fetchProfile(currentUser.id)
        } else {
          setProfile(null)
          setIsAdmin(false)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)