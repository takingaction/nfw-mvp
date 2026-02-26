import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
import { requireAdmin } from '@/middleware/adminCheck'
import { Suspense } from 'react'
import AdminMembersClient from '@/components/admin/AdminMembersClient'

async function AdminMembersContent() {
  await requireAdmin()

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, age_range, state, city, household_income, identities, subscription_status, subscription_ends_at, joined_at, is_admin, access_perks_synced_at')
    .order('joined_at', { ascending: false })

  if (error) {
    console.error('Error fetching members:', error)
    return <div className="text-red-600 p-8">Error loading members</div>
  }

  const { data: users } = await supabase.auth.admin.listUsers()

  const membersWithEmails = profiles?.map(profile => ({
    ...profile,
    email: users?.users.find(u => u.id === profile.id)?.email || profile.email || 'N/A',
  }))

  const total = membersWithEmails?.length || 0
  const paid = membersWithEmails?.filter(m => m.subscription_status === 'active').length || 0
  const free = total - paid
  const admins = membersWithEmails?.filter(m => m.is_admin).length || 0

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Manage Members</h1>
          <p className="text-gray-600 text-lg">View and manage all NFW members</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Members', value: total, color: 'bg-[#2d1239]', text: 'text-white' },
            { label: 'Paid Members', value: paid, color: 'bg-[#d4f1ad]', text: 'text-[#2d1239]' },
            { label: 'Free Members', value: free, color: 'bg-[#b2d1ee]', text: 'text-[#2d1239]' },
            { label: 'Admins', value: admins, color: 'bg-[#fdf493]', text: 'text-[#2d1239]' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.color} rounded-2xl p-6`}>
              <div className={`text-3xl font-black mb-1 ${stat.text}`}>{stat.value}</div>
              <div className={`text-sm font-semibold ${stat.text} opacity-70`}>{stat.label}</div>
            </div>
          ))}
        </div>

        <AdminMembersClient members={membersWithEmails || []} currentUserId={user?.id || ''} />
      </div>
    </main>
  )
}

export default function AdminMembersPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </main>
    }>
      <AdminMembersContent />
    </Suspense>
  )
}