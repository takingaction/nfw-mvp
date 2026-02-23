import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MyApplicationsPage() {
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

  // Fetch user's grant applications
  const { data: grants } = await supabase
    .from('grants')
    .select(`
      *,
      grant_cycles (
        cycle_name,
        end_date
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Calculate status counts
  const statusCounts = {
    draft: grants?.filter(g => g.status === 'draft').length || 0,
    submitted: grants?.filter(g => g.status === 'submitted').length || 0,
    under_review: grants?.filter(g => g.status === 'under_review').length || 0,
    approved: grants?.filter(g => g.status === 'approved').length || 0,
    rejected: grants?.filter(g => g.status === 'rejected').length || 0,
    funded: grants?.filter(g => g.status === 'funded').length || 0,
  }

  const categoryLabels: Record<string, string> = {
    childcare_support: 'Childcare Support',
    emergency_care: 'Emergency Care',
    education_essentials: 'Education & Essentials',
    medical_medicine: 'Medical & Medicine',
    rent_transportation: 'Rent & Transportation',
    school_supplies: 'School Supplies',
    food_essentials: 'Food Essentials',
    car_repair: 'Car Repair',
    small_business_starter: 'Small Business Starter',
    other: 'Other',
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-[#2d1239]/10 text-[#2d1239]',
    submitted: 'bg-[#b2d1ee]/30 text-[#2d1239]',
    under_review: 'bg-[#fdf493]/40 text-[#2d1239]',
    approved: 'bg-[#d4f1ad]/40 text-[#2d1239]',
    rejected: 'bg-red-100 text-red-800',
    funded: 'bg-[#BCAFCF]/30 text-[#2d1239]',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Pending',
    submitted: 'Submitted - Awaiting Review',
    under_review: 'Being Reviewed',
    approved: 'Approved',
    rejected: 'Not Approved',
    funded: 'Funded',
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Lean Header */}
      <div className="bg-white pt-8 pb-6 border-b border-[#2d1239]/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#2d1239] mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                My Grant Applications
              </h2>
              <p className="text-[#2d1239]/60">
                Track your microgrant applications and their status
              </p>
            </div>
            <Link
              href="/grants/apply"
              className="bg-[#2d1239] text-white px-5 py-2.5 rounded-xl hover:bg-[#2d1239]/90 font-medium transition-colors"
            >
              + New Application
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-[#f8f7fa] rounded-xl p-4 border border-[#2d1239]/5">
            <div className="text-2xl font-bold text-[#2d1239]">{statusCounts.draft}</div>
            <div className="text-sm text-[#2d1239]/60">Pending</div>
          </div>
          <div className="bg-[#f8f7fa] rounded-xl p-4 border border-[#2d1239]/5">
            <div className="text-2xl font-bold text-[#2d1239]">{statusCounts.submitted}</div>
            <div className="text-sm text-[#2d1239]/60">Awaiting Review</div>
          </div>
          <div className="bg-[#f8f7fa] rounded-xl p-4 border border-[#2d1239]/5">
            <div className="text-2xl font-bold text-[#2d1239]">{statusCounts.under_review}</div>
            <div className="text-sm text-[#2d1239]/60">Being Reviewed</div>
          </div>
          <div className="bg-[#f8f7fa] rounded-xl p-4 border border-[#2d1239]/5">
            <div className="text-2xl font-bold text-[#d4f1ad]" style={{ color: '#22c55e' }}>{statusCounts.approved}</div>
            <div className="text-sm text-[#2d1239]/60">Approved</div>
          </div>
          <div className="bg-[#f8f7fa] rounded-xl p-4 border border-[#2d1239]/5">
            <div className="text-2xl font-bold text-red-500">{statusCounts.rejected}</div>
            <div className="text-sm text-[#2d1239]/60">Not Approved</div>
          </div>
          <div className="bg-[#f8f7fa] rounded-xl p-4 border border-[#2d1239]/5">
            <div className="text-2xl font-bold text-[#BCAFCF]">{statusCounts.funded}</div>
            <div className="text-sm text-[#2d1239]/60">Funded</div>
          </div>
        </div>

        {/* Applications List */}
        {grants && grants.length > 0 ? (
          <div className="space-y-4">
            {grants.map((grant) => (
              <div key={grant.id} className="bg-white rounded-xl border border-[#2d1239]/10 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-[#2d1239]">{grant.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[grant.status]}`}>
                        {statusLabels[grant.status]}
                      </span>
                    </div>
                    <p className="text-sm text-[#2d1239]/60 mb-2">
                      {categoryLabels[grant.category]} • ${grant.amount_requested.toLocaleString()}
                    </p>
                    <p className="text-sm text-[#2d1239]/50">
                      Cycle: {grant.grant_cycles?.cycle_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#2d1239]/50">
                      Applied: {new Date(grant.created_at).toLocaleDateString()}
                    </p>
                    {grant.submitted_at && (
                      <p className="text-sm text-[#2d1239]/50">
                        Submitted: {new Date(grant.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-[#2d1239]/70 mb-4 line-clamp-2">{grant.description}</p>

                <div className="flex gap-4 pt-4 border-t border-[#2d1239]/10">
                  <Link
                    href={`/grants/view/${grant.id}`}
                    className="text-[#2d1239] hover:text-[#2d1239]/70 text-sm font-medium transition-colors"
                  >
                    View Details →
                  </Link>
                  {grant.status === 'draft' && (
                    <Link
                      href={`/grants/edit/${grant.id}`}
                      className="text-[#2d1239]/60 hover:text-[#2d1239] text-sm font-medium transition-colors"
                    >
                      Edit Draft
                    </Link>
                  )}
                  {grant.status === 'approved' && !grant.stripe_connect_account_id && (
                    <Link
                      href="/grants/connect-bank"
                      className="text-[#22c55e] hover:text-[#22c55e]/80 text-sm font-medium transition-colors"
                    >
                      Connect Bank Account →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#f8f7fa] rounded-xl border border-[#2d1239]/10 p-12 text-center">
            <div className="text-5xl mb-4 opacity-30">📝</div>
            <h3 className="text-xl font-semibold text-[#2d1239] mb-2">No Applications Yet</h3>
            <p className="text-[#2d1239]/60 mb-6 max-w-md mx-auto">
              You haven&apos;t submitted any grant applications. Start your first application to get support for your needs.
            </p>
            <Link
              href="/grants/apply"
              className="inline-block bg-[#2d1239] text-white px-6 py-3 rounded-xl hover:bg-[#2d1239]/90 font-medium transition-colors"
            >
              Apply for a Grant
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}