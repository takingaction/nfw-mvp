import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  ChevronRight
} from 'lucide-react'

export default async function GrantsViewPage() {
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

  // Fetch all grant applications for this user
  const { data: grants } = await supabase
    .from('grants')
    .select('*')
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium border border-gray-300">
            <FileText className="w-3 h-3" />
            Draft
          </span>
        )
      case 'submitted':
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fdf493]/30 text-[#2d1239] text-xs font-medium border border-[#fdf493]">
            <Clock className="w-3 h-3" />
            {status === 'submitted' ? 'Submitted' : 'Under Review'}
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#BCAFCF]/20 text-[#2d1239] text-xs font-medium border border-[#BCAFCF]">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        )
      case 'funded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#d4f1ad]/30 text-[#2d1239] text-xs font-medium border border-[#d4f1ad]">
            <DollarSign className="w-3 h-3" />
            Funded
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
            {status}
          </span>
        )
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-[#f8f7fa]">
      {/* Header */}
      <div className="bg-white border-b border-[#2d1239]/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[#2d1239]/60 hover:text-[#2d1239] transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#2d1239]">My Grant Applications</h1>
              <p className="text-[#2d1239]/60 mt-1">
                {grants?.length || 0} application{grants?.length !== 1 ? 's' : ''} total
              </p>
            </div>
            <Link
              href="/grants/apply"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2d1239] text-white rounded-lg hover:bg-[#2d1239]/90 transition-colors font-medium"
            >
              <FileText className="w-4 h-4" />
              New Application
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!grants || grants.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#2d1239]/10 p-12 text-center">
            <FileText className="w-16 h-16 text-[#2d1239]/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#2d1239] mb-2">No Applications Yet</h3>
            <p className="text-[#2d1239]/60 mb-6">
              You haven&apos;t submitted any grant applications yet.
            </p>
            <Link
              href="/grants/apply"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2d1239] text-white rounded-xl hover:bg-[#2d1239]/90 transition-colors font-medium"
            >
              <FileText className="w-5 h-5" />
              Apply for Microgrant
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {grants.map((grant) => (
              <Link
                key={grant.id}
                href={`/grants/view/${grant.id}`}
                className="block bg-white rounded-xl border border-[#2d1239]/10 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-[#f8f7fa] border border-[#2d1239]/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#2d1239]" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-[#2d1239] mb-1">
                          {grant.title || 'Untitled Application'}
                        </h3>
                        {grant.category && (
                          <p className="text-sm text-[#2d1239]/60">
                            {grant.category}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(grant.status)}
                    </div>

                    {/* Description */}
                    {grant.description && (
                      <p className="text-sm text-[#2d1239]/70 mb-3 line-clamp-2">
                        {grant.description}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#2d1239]/60">
                      {grant.amount_requested && (
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span className="font-medium text-[#2d1239]">
                            {formatCurrency(grant.amount_requested)} requested
                          </span>
                        </div>
                      )}
                      {grant.submitted_at && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Submitted {formatDate(grant.submitted_at)}</span>
                        </div>
                      )}
                      {grant.funded_at && grant.payout_amount && (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          <span className="font-medium text-green-600">
                            {formatCurrency(grant.payout_amount)} funded
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0">
                    <ChevronRight className="w-5 h-5 text-[#2d1239]/40" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}