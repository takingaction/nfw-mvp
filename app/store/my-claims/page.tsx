import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MyClaimsClient from '@/components/MyClaimsClient'
import { Suspense } from 'react'
import Link from 'next/link'

async function MyClaimsContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, membership_level')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/profile')
  }

  // Fetch user's claims with item details
  const { data: claims, error } = await supabase
    .from('zero_dollar_claims')
    .select(`
      *,
      item:zero_dollar_items(
        id,
        name,
        description,
        image_url,
        category:zero_dollar_categories(name)
      )
    `)
    .eq('member_id', user.id)
    .order('claimed_at', { ascending: false })

  if (error) {
    console.error('Error fetching claims:', error)
    return <div className="text-red-600">Error loading your claims</div>
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Claims</h1>
              <p className="text-gray-600 text-lg">
                Track your claimed items and shipping status
              </p>
            </div>
            <Link 
              href="/store"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Browse Store
            </Link>
          </div>
        </div>
        
        <MyClaimsClient claims={claims || []} userName={profile.full_name} />
      </div>
    </main>
  )
}

export default function MyClaimsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg shadow-md p-6">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    }>
      <MyClaimsContent />
    </Suspense>
  )
}