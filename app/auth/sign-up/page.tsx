import { Suspense } from 'react'
import SignUpFlow from '@/components/SignUpFlow'

export const metadata = {
  title: 'Join NFW',
  description: 'Create your National Fund for Women account and start accessing microgrants, perks, and more today.',
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SignUpFlow />
    </Suspense>
  )
}