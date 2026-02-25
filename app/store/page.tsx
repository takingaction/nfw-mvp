import { createClient } from '@/lib/supabase/server'
import StoreClient from '@/components/StoreClient'

export const metadata = {
  title: 'Zero Dollar Store',
  description: 'Free items for NFW members. Claim yours today — no cost, no catch.',
  openGraph: {
    title: 'Zero Dollar Store | National Fund for Women',
    description: 'Free items for NFW members. Claim yours today.',
    url: 'https://nationalfundforwomen.org/store',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630 }],
  },
}

async function StoreContent({
  searchParams
}: {
  searchParams: Promise<{ search?: string; category?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Build query
  let query = supabase
    .from('zero_dollar_items')
    .select(`
      *,
      category:zero_dollar_categories(id, name, slug, icon)
    `)
    .eq('is_active', true)

  // Apply search filter
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`)
  }

  // Apply category filter
  if (params.category) {
    const { data: category } = await supabase
      .from('zero_dollar_categories')
      .select('id')
      .eq('slug', params.category)
      .single()
    
    if (category) {
      query = query.eq('category_id', category.id)
    }
  }

  const { data: items, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 text-red-600">Error Loading Items</h1>
          <pre className="bg-white p-6 rounded-lg shadow">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      </main>
    )
  }

  // Fetch categories
  const { data: categories } = await supabase
    .from('zero_dollar_categories')
    .select('*')
    .order('display_order', { ascending: true })

// Get user's claim count for each item
let userClaims: Record<string, number> = {}
if (user) {
  const { data: claims } = await supabase
    .from('zero_dollar_claims')
    .select('item_id')
    .eq('member_id', user.id)  // ← Use member_id
  
  if (claims) {
    userClaims = claims.reduce((acc, claim) => {
      acc[claim.item_id] = (acc[claim.item_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
}

  // Add user claim count to items
  const itemsWithClaims = items?.map(item => ({
    ...item,
    user_claim_count: userClaims[item.id] || 0
  })) || []

  return (
    <StoreClient
      items={itemsWithClaims}
      categories={categories || []}
      currentCategory={params.category}
      currentSearch={params.search}
      userId={user?.id}
    />
  )
}

export default async function StorePage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; category?: string }>
}) {
  return <StoreContent searchParams={searchParams} />
}