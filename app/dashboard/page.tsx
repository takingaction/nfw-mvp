import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import GrantsStatusWidget from '@/components/GrantsStatusWidget'
import RecentRedemptions from '@/components/dashboard/RecentRedemptions'
import Link from 'next/link'
import { 
  FileText, 
  Gift, 
  ShoppingBag, 
  User, 
  Crown,
  TrendingUp,
  Plus
} from 'lucide-react'

export const metadata = {
  title: 'Dashboard',
  description: 'Your National Fund for Women member dashboard.',
}

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

  const membershipDisplay: Record<string, { label: string; bgColor: string; textColor: string; borderColor: string; icon: string }> = {
    free: { 
      label: 'Free Member', 
      bgColor: 'bg-[#f8f7fa]',
      textColor: 'text-[#2d1239]',
      borderColor: 'border-[#2d1239]/20',
      icon: '👋'
    },
    contributing: { 
      label: 'Contributing Member', 
      bgColor: 'bg-[#BCAFCF]/20',
      textColor: 'text-[#2d1239]',
      borderColor: 'border-[#BCAFCF]',
      icon: '⭐'
    },
    founding: { 
      label: 'Founding Member', 
      bgColor: 'bg-[#d4f1ad]/30',
      textColor: 'text-[#2d1239]',
      borderColor: 'border-[#d4f1ad]',
      icon: '👑'
    },
  }

  const currentMembership = membershipDisplay[profile?.membership_level || 'free']

  return (
    <main className="min-h-screen bg-[#f8f7fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2d1239] mb-2">
            Welcome back, {profile?.full_name || 'Member'}! 👋
          </h1>
          <p className="text-[#2d1239]/60">
            Here&apos;s what&apos;s happening with your NFW membership
          </p>
        </div>

        {/* Top Row - Membership & Grants */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Membership Status Card */}
<div className="bg-white rounded-xl border border-[#2d1239]/10 overflow-hidden">
  <div className="p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-lg bg-[#BCAFCF]/20 flex items-center justify-center">
        <Crown className="w-5 h-5 text-[#2d1239]" />
      </div>
      <h3 className="text-lg font-semibold text-[#2d1239]">Membership Status</h3>
    </div>
    
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-semibold mb-4 ${currentMembership.bgColor} ${currentMembership.textColor} ${currentMembership.borderColor}`}>
      <span className="text-lg">{currentMembership.icon}</span>
      {currentMembership.label}
    </div>

    <div className="space-y-2 mb-4">
      <div className="text-sm">
        <span className="text-[#2d1239]/60">Member Since: </span>
        <span className="font-medium text-[#2d1239]">
          {profile?.joined_at 
            ? new Date(profile.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : 'Recently'}
        </span>
      </div>
      {profile?.subscription_ends_at && (
        <div className="text-sm">
          <span className="text-[#2d1239]/60">Renews: </span>
          <span className="font-medium text-[#2d1239]">
            {new Date(profile.subscription_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      )}
    </div>

    <Link
      href="/profile"
      className="inline-flex items-center gap-2 text-[#2d1239] hover:text-[#2d1239]/80 text-sm font-medium transition-colors"
    >
      Manage Membership
      <TrendingUp className="w-4 h-4" />
    </Link>
  </div>
</div>

          {/* Grants Status Widget */}
          <GrantsStatusWidget statusCounts={grantStatusCounts} />
        </div>

        {/* Recent Redemptions - Full Width */}
        <div className="mb-6">
          <RecentRedemptions />
        </div>

        {/* Quick Actions Grid */}
        <div className="bg-white rounded-xl border border-[#2d1239]/10 overflow-hidden">
          <div className="p-6 border-b border-[#2d1239]/10">
            <h3 className="text-lg font-semibold text-[#2d1239]">Quick Actions</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#2d1239]/10">
            {/* Apply for Microgrant */}
            <Link
              href="/grants/apply"
              className="p-6 hover:bg-[#f8f7fa] transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#d4f1ad]/30 flex items-center justify-center group-hover:bg-[#d4f1ad]/50 transition-colors">
                  <FileText className="w-5 h-5 text-[#2d1239]" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#2d1239] mb-1">Apply for Microgrant</h4>
                  <p className="text-xs text-[#2d1239]/60">Submit your application</p>
                </div>
              </div>
            </Link>

            {/* Browse Perks */}
            <Link
              href="/perks"
              className="p-6 hover:bg-[#f8f7fa] transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#BCAFCF]/20 flex items-center justify-center group-hover:bg-[#BCAFCF]/30 transition-colors">
                  <Gift className="w-5 h-5 text-[#2d1239]" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#2d1239] mb-1">Browse Member Perks</h4>
                  <p className="text-xs text-[#2d1239]/60">Exclusive discounts & offers</p>
                </div>
              </div>
            </Link>

            {/* Zero Dollar Store */}
            <Link
              href="/store"
              className="p-6 hover:bg-[#f8f7fa] transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#b2d1ee]/30 flex items-center justify-center group-hover:bg-[#b2d1ee]/50 transition-colors">
                  <ShoppingBag className="w-5 h-5 text-[#2d1239]" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#2d1239] mb-1">Zero Dollar Store</h4>
                  <p className="text-xs text-[#2d1239]/60">Shop free essentials</p>
                </div>
              </div>
            </Link>

            {/* Update Profile */}
            <Link
              href="/profile"
              className="p-6 hover:bg-[#f8f7fa] transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#fdf493]/30 flex items-center justify-center group-hover:bg-[#fdf493]/50 transition-colors">
                  <User className="w-5 h-5 text-[#2d1239]" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#2d1239] mb-1">Update Profile</h4>
                  <p className="text-xs text-[#2d1239]/60">Manage your information</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}