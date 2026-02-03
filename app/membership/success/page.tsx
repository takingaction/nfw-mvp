import Link from 'next/link'

export default function SuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold mb-2">Welcome to NFW!</h1>
        <p className="text-gray-600 mb-6">
          Your membership is now active. Thank you for your support!
        </p>
        <Link
          href="/profile"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Complete Your Profile
        </Link>
      </div>
    </main>
  )
}