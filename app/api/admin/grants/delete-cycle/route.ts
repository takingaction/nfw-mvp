import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { cycleId } = await request.json()
    if (!cycleId) return NextResponse.json({ error: 'Missing cycleId' }, { status: 400 })

    // Block deletion if applications exist
    const { count } = await supabaseAdmin
      .from('grants')
      .select('id', { count: 'exact', head: true })
      .eq('cycle_id', cycleId)

    if (count && count > 0) {
      return NextResponse.json({
        error: `Cannot delete — this cycle has ${count} application${count !== 1 ? 's' : ''}. Remove all applications first.`
      }, { status: 409 })
    }

    const { error } = await supabaseAdmin
      .from('grant_cycles')
      .delete()
      .eq('id', cycleId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}