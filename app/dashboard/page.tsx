import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import GrantsStatusWidget from '@/components/GrantsStatusWidget'
import Link from 'next/link'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch grant applications for status widget
  const { data: grants } = await supabase
    .from('grants')
    .select('status')
    .eq('user_id', user.id)

  const grantStatusCounts = {
    total: grants?.length || 0,
    in_process: grants?.filter(g => 
      g.status === 'submitted' || g.status === 'under_review'
    ).length || 0,
    approved: grants?.filter(g => g.status === 'approved').length || 0,
    funded: grants?.filter(g => g.status === 'funded').length || 0,
  }

  const membershipDisplay: Record<string, { label: string; color: string }> = {
    free: { label: 'Free Member', color: 'bg-gray-100 text-gray-800' },
    contributing: { label: 'Contributing Member', color: 'bg-blue-100 text-blue-800' },
    founding: { label: 'Founding Member', color: 'bg-purple-100 text-purple-800' },
  }

  const currentMembership = membershipDisplay[profile?.membership_level || 'free']

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.full_name || 'Member'}!
          </h1>
          <p className="text-gray-600">
            Here&apos;s your NFW member dashboard
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Membership Status Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Membership Status</h3>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${currentMembership.color} mb-4`}>
              {currentMembership.label}
            </span>
            <Link
              href="/profile"
              className="block text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Manage Membership →
            </Link>
          </div>

          {/* Grants Status Widget */}
          <GrantsStatusWidget statusCounts={grantStatusCounts} />

          {/* Quick Actions Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/grants/apply"
                className="block text-blue-600 hover:text-blue-800 font-medium"
              >
                📝 Apply for Microgrant
              </Link>
              <Link
                href="/perks"
                className="block text-blue-600 hover:text-blue-800 font-medium"
              >
                🎁 Browse Member Perks
              </Link>
              <Link
                href="/store"
                className="block text-blue-600 hover:text-blue-800 font-medium"
              >
                🛍️ Visit Zero Dollar Store
              </Link>
              <Link
                href="/profile"
                className="block text-blue-600 hover:text-blue-800 font-medium"
              >
                👤 Update Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}