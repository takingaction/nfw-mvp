import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { user_id, cycle_id, category, title, description, amount_requested } = body

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

    if (!session || session.user.id !== user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create grant application
    const { data: grant, error } = await supabase
      .from('grants')
      .insert({
        user_id,
        cycle_id,
        category,
        title,
        description,
        amount_requested,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating grant:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, grantId: grant.id })
  } catch (error: any) {
    console.error('Grant creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}