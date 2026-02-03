import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = searchParams.get('page') || '1'
  const perPage = searchParams.get('per_page') || '20'
  const postalCode = searchParams.get('postal_code')
  const distance = searchParams.get('distance') || '25mi'
  const categoryKey = searchParams.get('category_key')

  // 1. Create Supabase client
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

  // 2. Verify user is authenticated
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, zip, membership_level')
    .eq('id', session.user.id)
    .single()

  const searchPostalCode = postalCode || profile?.zip || '10001'

  // 4. Build Access API request
  const accessApiUrl = process.env.ACCESS_API_URL || 'https://offer-stage.adcrws.com'
  const accessToken = process.env.ACCESS_API_TOKEN

  console.log('=== ACCESS API DEBUG ===')
  console.log('API URL:', accessApiUrl)
  console.log('Token exists:', !!accessToken)
  console.log('Token length:', accessToken?.length)

  if (!accessToken) {
    return NextResponse.json({ error: 'API not configured' }, { status: 500 })
  }

  try {
    const params = new URLSearchParams({
      member_key: session.user.id,
      postal_code: searchPostalCode,
      distance: distance,
      page: page,
      per_page: perPage,
    })

    if (categoryKey) {
      params.append('category_key', categoryKey)
    }

    const fullUrl = `${accessApiUrl}/v1/offers?${params.toString()}`
    console.log('Full request URL:', fullUrl)

    const response = await fetch(fullUrl, {
      headers: {
        'Access-Token': accessToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)

    const responseText = await response.text()
    console.log('Response body:', responseText.substring(0, 500))

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'Invalid API token', details: responseText }, { status: 401 })
      }
      return NextResponse.json({ error: 'Access API error', status: response.status, details: responseText }, { status: 500 })
    }

    const data = JSON.parse(responseText)

    return NextResponse.json({
      user: {
        name: profile?.full_name,
        membership: profile?.membership_level,
        postal_code: searchPostalCode,
      },
      offers: data.data || [],
      meta: data.meta || {},
      links: data.links || {},
    })

  } catch (error) {
    console.error('Access API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch offers', details: String(error) },
      { status: 500 }
    )
  }
}