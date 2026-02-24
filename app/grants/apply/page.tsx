import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import GrantApplicationForm from '@/components/GrantApplicationForm'

export default async function ApplyForGrantPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    <main className="min-h-screen bg-white">
      {/* Lean Header */}
      <div className="bg-white pt-8 pb-6 border-b border-[#2d1239]/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2d1239] mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Apply for a Microgrant
          </h2>
          <p className="text-[#2d1239]/60">
            NFW microgrants help with real-life needs like childcare, medical costs, car repairs, and more.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {cycles && cycles.length > 0 ? (
          <GrantApplicationForm 
            userId={user.id} 
            cycles={cycles}
            userProfile={profile}
          />
        ) : (
          <div className="bg-[#fdf493]/20 border border-[#fdf493] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#2d1239] mb-2">
              No Grant Cycles Available
            </h3>
            <p className="text-[#2d1239]/70">
              There are currently no open grant cycles. Please check back later or contact us for more information.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}