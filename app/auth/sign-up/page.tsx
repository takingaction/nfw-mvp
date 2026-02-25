import { Suspense } from 'react'
import SignUpFlow from '@/components/SignUpFlow'

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SignUpFlow />
    </Suspense>
  )
}