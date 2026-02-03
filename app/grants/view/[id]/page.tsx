import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function GrantDetailPage({ params }: { params: { id: string } }) {
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

  // Fetch grant details
  const { data: grant } = await supabase
    .from('grants')
    .select(`
      *,
      grant_cycles (
        cycle_name,
        description,
        start_date,
        end_date,
        total_funds,
        available_funds
      ),
      profiles (
        full_name,
        email,
        stripe_connect_account_id
      )
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!grant) {
    redirect('/grants/my-applications')
  }

  // Fetch documents
  const { data: documents } = await supabase
    .from('grant_documents')
    .select('*')
    .eq('grant_id', params.id)
    .order('uploaded_at', { ascending: false })

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
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/grants/my-applications"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          ← Back to My Applications
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{grant.title}</h1>
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[grant.status]}`}>
                  {statusLabels[grant.status]}
                </span>
                <span className="text-gray-600">
                  {categoryLabels[grant.category]}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                ${grant.amount_requested.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Requested Amount</div>
            </div>
          </div>

          {/* Grant Cycle Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Grant Cycle</h3>
            <p className="text-gray-700">{grant.grant_cycles?.cycle_name}</p>
            <p className="text-sm text-gray-500">
              {new Date(grant.grant_cycles?.start_date).toLocaleDateString()} - {new Date(grant.grant_cycles?.end_date).toLocaleDateString()}
            </p>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{grant.description}</p>
          </div>

          {/* Timeline */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Application Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div>
                  <div className="font-medium">Application Created</div>
                  <div className="text-sm text-gray-500">
                    {new Date(grant.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              {grant.submitted_at && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div>
                    <div className="font-medium">Submitted for Review</div>
                    <div className="text-sm text-gray-500">
                      {new Date(grant.submitted_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
              {grant.reviewed_at && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <div>
                    <div className="font-medium">Reviewed</div>
                    <div className="text-sm text-gray-500">
                      {new Date(grant.reviewed_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
              {grant.funded_at && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  <div>
                    <div className="font-medium">Funded</div>
                    <div className="text-sm text-gray-500">
                      {new Date(grant.funded_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Supporting Documents */}
        {documents && documents.length > 0 && (
          <div className="bg-white rounded-lg shadow p-8 mb-6">
            <h3 className="font-semibold mb-4">Supporting Documents</h3>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <div>
                    <div className="font-medium">{doc.file_name}</div>
                    <div className="text-sm text-gray-500">
                      Uploaded {new Date(doc.uploaded_at).toLocaleDateString()} • {(doc.file_size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <a
                    href={doc.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {grant.status === 'approved' && !grant.profiles?.stripe_connect_account_id && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-2">
              🎉 Your Grant Has Been Approved!
            </h3>
            <p className="text-green-800 mb-4">
              To receive your funds, you need to connect your bank account. This is a secure process handled by Stripe.
            </p>
            <Link
              href="/grants/connect-bank"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Connect Bank Account
            </Link>
          </div>
        )}

        {grant.status === 'funded' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="font-semibold text-purple-900 mb-2">
              ✅ Grant Funded
            </h3>
            <p className="text-purple-800">
              Your grant of ${grant.payout_amount?.toLocaleString()} has been disbursed to your bank account.
              {grant.payout_date && ` Sent on ${new Date(grant.payout_date).toLocaleDateString()}.`}
            </p>
          </div>
        )}

        {grant.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="font-semibold text-red-900 mb-2">
              Application Not Approved
            </h3>
            <p className="text-red-800">
              Unfortunately, your application was not approved at this time. You may apply again in future grant cycles.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}