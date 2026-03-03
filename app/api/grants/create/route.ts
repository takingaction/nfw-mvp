import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { cycle_id, who_are_you, biggest_challenge, fund_usage, is_nominating } = body

    // Check for duplicate application
    const { data: existing } = await supabaseAdmin
      .from('grants')
      .select('id')
      .eq('user_id', user.id)
      .eq('cycle_id', cycle_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'You have already applied for this grant cycle.' }, { status: 409 })
    }

    const { data: grant, error } = await supabaseAdmin
      .from('grants')
      .insert({
        user_id: user.id,
        cycle_id,
        who_are_you,
        biggest_challenge,
        fund_usage,
        is_nominating: is_nominating || false,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating grant:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, grantId: grant.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}