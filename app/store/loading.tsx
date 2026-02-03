export default function Loading() {
  return (
    <main className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading store items...</p>
      </div>
    </main>
  )
}