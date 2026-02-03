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
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    under_review: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    funded: 'bg-purple-100 text-purple-800',
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
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Grant Applications</h1>
            <p className="text-gray-600">
              Track your microgrant applications and their status
            </p>
          </div>
          <Link
            href="/grants/apply"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            + New Application
          </Link>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{statusCounts.draft}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.submitted}</div>
            <div className="text-sm text-gray-600">Awaiting Review</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.under_review}</div>
            <div className="text-sm text-gray-600">Being Reviewed</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{statusCounts.approved}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">{statusCounts.rejected}</div>
            <div className="text-sm text-gray-600">Not Approved</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">{statusCounts.funded}</div>
            <div className="text-sm text-gray-600">Funded</div>
          </div>
        </div>

        {/* Applications List */}
        {grants && grants.length > 0 ? (
          <div className="space-y-4">
            {grants.map((grant) => (
              <div key={grant.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{grant.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[grant.status]}`}>
                        {statusLabels[grant.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {categoryLabels[grant.category]} • ${grant.amount_requested.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Cycle: {grant.grant_cycles?.cycle_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      Applied: {new Date(grant.created_at).toLocaleDateString()}
                    </p>
                    {grant.submitted_at && (
                      <p className="text-sm text-gray-500">
                        Submitted: {new Date(grant.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-gray-700 mb-4 line-clamp-2">{grant.description}</p>

                <div className="flex gap-3">
                  <Link
                    href={`/grants/view/${grant.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Details →
                  </Link>
                  {grant.status === 'draft' && (
                    <Link
                      href={`/grants/edit/${grant.id}`}
                      className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                      Edit Draft
                    </Link>
                  )}
                  {grant.status === 'approved' && !grant.stripe_connect_account_id && (
                    <Link
                      href="/grants/connect-bank"
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Connect Bank Account →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold mb-2">No Applications Yet</h2>
            <p className="text-gray-600 mb-6">
              You haven&apos;t submitted any grant applications. Start your first application to get support for your needs.
            </p>
            <Link
              href="/grants/apply"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Apply for a Grant
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}