import Link from 'next/link'

export default function CancelPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
        <p className="text-gray-600 mb-6">
          No worries! You can always upgrade your membership later.
        </p>
        <Link
          href="/membership"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Back to Membership Options
        </Link>
      </div>
    </main>
  )
}