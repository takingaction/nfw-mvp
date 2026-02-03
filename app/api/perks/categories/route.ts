import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
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

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessApiUrl = process.env.ACCESS_API_URL || 'https://offer-stage.adcrws.com'
  const accessToken = process.env.ACCESS_API_TOKEN

  if (!accessToken) {
    return NextResponse.json({ error: 'API not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `${accessApiUrl}/v1/categories?member_key=${session.user.id}`,
      {
        headers: {
          'Access-Token': accessToken,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Access API error: ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      categories: data.data || [],
    })

  } catch (error) {
    console.error('Access API categories error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}