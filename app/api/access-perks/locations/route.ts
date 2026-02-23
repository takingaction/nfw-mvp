import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const offerGroup = searchParams.get('offer_group')
    const storeKey = searchParams.get('store_key')
    const postalCode = searchParams.get('postal_code')
    const distance = searchParams.get('distance') || '25mi'
    const page = searchParams.get('page') || '1'
    const perPage = searchParams.get('per_page') || '50'

    console.log('=== LOCATIONS API REQUEST ===')
    console.log('offer_group:', offerGroup)
    console.log('store_key:', storeKey)
    console.log('postal_code:', postalCode)
    console.log('distance:', distance)

    // Verify user is authenticated
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ No user authenticated')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.id)

    // Get user's zip code if not provided
    let searchPostalCode = postalCode
    if (!searchPostalCode) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('zip')
        .eq('id', user.id)
        .single()
      searchPostalCode = profile?.zip || '10001'
    }

    console.log('📍 Search postal code:', searchPostalCode)

    // Build Access API request
const accessApiUrl = process.env.ACCESS_OFFERS_API_URL || 'https://offer.adcrws-stage.com'
const accessToken = process.env.ACCESS_OFFERS_TOKEN

    if (!accessToken) {
      console.log('❌ No API token configured')
      return NextResponse.json({ error: 'API not configured' }, { status: 500 })
    }

    console.log('🔑 API URL:', accessApiUrl)
    console.log('🔑 Token exists:', !!accessToken)

    // Build query parameters
    const params = new URLSearchParams({
      member_key: user.id,
      postal_code: searchPostalCode,
      distance: distance,
      page: page,
      per_page: perPage,
    })

    if (offerGroup) {
      params.append('offer_group', offerGroup)
    }

    if (storeKey) {
      params.append('store_key', storeKey)
    }

    const fullUrl = `${accessApiUrl}/v1/locations?${params.toString()}`
    console.log('🌐 Full URL:', fullUrl)

    // Call Access Locations API
    const response = await fetch(fullUrl, {
      headers: {
        'Access-Token': accessToken,
        'Accept': 'application/json',
      },
    })

    console.log('📡 Response status:', response.status)
    console.log('📡 Response ok:', response.ok)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Access Locations API error:', response.status)
      console.error('❌ Error body:', errorText.substring(0, 500))
      return NextResponse.json(
        { error: 'Failed to fetch locations', status: response.status, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
console.log('📦 FULL API RESPONSE:', JSON.stringify(data, null, 2))
console.log('✅ Locations found:', data.data?.length || 0)
console.log('✅ Total count:', data.meta?.total_count)

return NextResponse.json({
  locations: data.locations || [],
  meta: {
    total_count: data.info?.total_results,
    current_page: data.info?.current_page,
    total_pages: data.info?.total_pages,
  },
  search_postal_code: searchPostalCode,
})

  } catch (error: any) {
    console.error('❌ Locations API error:', error)
    console.error('❌ Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Failed to fetch locations', details: error.message },
      { status: 500 }
    )
  }
}