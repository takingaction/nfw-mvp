import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import GrantApplicationForm from '@/components/GrantApplicationForm'

export default async function ApplyForGrantPage() {
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

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  // Fetch open grant cycles
  const { data: cycles } = await supabase
    .from('grant_cycles')
    .select('*')
    .eq('status', 'open')
    .order('end_date', { ascending: true })

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Apply for a Microgrant</h1>
          <p className="text-gray-600">
            NFW microgrants help with real-life needs like childcare, medical costs, car repairs, and more.
          </p>
        </div>

        {cycles && cycles.length > 0 ? (
          <GrantApplicationForm 
            userId={user.id} 
            cycles={cycles}
            userProfile={profile}
          />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">
              No Grant Cycles Available
            </h2>
            <p className="text-yellow-800">
              There are currently no open grant cycles. Please check back later or contact us for more information.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}