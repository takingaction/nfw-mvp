import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/middleware/adminCheck'
import AdminClaimsClient from '@/components/admin/AdminClaimsClient'
import { Suspense } from 'react'

async function AdminClaimsContent() {
  await requireAdmin()
  
  const supabase = await createClient()

  // Fetch all claims with item and member details
  const { data: claims, error } = await supabase
    .from('zero_dollar_claims')
    .select(`
      *,
      item:zero_dollar_items(
        id,
        name,
        image_url,
        category:zero_dollar_categories(name)
      ),
      member:profiles(
        id,
        full_name,
        email:id
      )
    `)
    .order('claimed_at', { ascending: false })

  if (error) {
    console.error('Error fetching claims:', error)
    return <div className="text-red-600">Error loading claims</div>
  }

  // Get member emails from auth.users
  const memberIds = claims?.map(c => c.member_id) || []
  const { data: users } = await supabase.auth.admin.listUsers()
  
  // Map user emails to claims
  const claimsWithEmails = claims?.map(claim => ({
    ...claim,
    member_email: users?.users.find(u => u.id === claim.member_id)?.email || 'N/A'
  }))

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Manage Claims</h1>
          <p className="text-gray-600 text-lg">
            View and manage all Zero Dollar Store claims
          </p>
        </div>
        
        <AdminClaimsClient claims={claimsWithEmails || []} />
      </div>
    </main>
  )
}

export default function AdminClaimsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </main>
    }>
      <AdminClaimsContent />
    </Suspense>
  )
}