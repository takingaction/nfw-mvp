import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function ConnectReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ grantId?: string }>
}) {
  const { grantId } = await searchParams

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify the Connect account is fully onboarded
  if (grantId) {
    const { data: grant } = await supabaseAdmin
      .from('grants')
      .select('stripe_connect_account_id')
      .eq('id', grantId)
      .single()

    if (grant?.stripe_connect_account_id) {
      const account = await stripe.accounts.retrieve(grant.stripe_connect_account_id)
      if (account.details_submitted) {
        // Mark as payment pending
        await supabaseAdmin
          .from('grants')
          .update({ status: 'payment_pending' })
          .eq('id', grantId)
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#2d1239] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-[#d4f1ad] rounded-full flex items-center justify-center mx-auto mb-8">
          <Check className="w-10 h-10 text-[#2d1239]" strokeWidth={3} />
        </div>
        <h1 className="text-3xl font-black text-white mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Bank account connected!
        </h1>
        <p className="text-[#bcafcf] mb-8">
          Your bank account has been successfully connected. Our team will process your payment shortly.
        </p>
        <Link
          href={grantId ? `/grants/view/${grantId}` : '/grants/my-applications'}
          className="inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold hover:bg-[#fdf493]/90 transition-all"
        >
          View My Application →
        </Link>
      </div>
    </main>
  )
}