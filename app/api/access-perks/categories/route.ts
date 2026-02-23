import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCategories } from '@/lib/access-perks/offers'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Sanitize member_key
    const memberKey = user.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

    // Get categories
    const result = await getCategories(memberKey)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get categories' },
      { status: 500 }
    )
  }
}