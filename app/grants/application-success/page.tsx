import Link from 'next/link'

export default function ApplicationSuccessPage() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Your microgrant application has been successfully submitted. Our review team will evaluate your application and notify you of the decision.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/grants/my-applications"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              View My Applications
            </Link>
            <Link
              href="/grants/apply"
              className="inline-block border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50"
            >
              Submit Another Application
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}