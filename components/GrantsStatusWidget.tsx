import Link from 'next/link'

interface GrantsStatusWidgetProps {
  statusCounts: {
    total: number
    in_process: number
    approved: number
    funded: number
  }
}

export default function GrantsStatusWidget({ statusCounts }: GrantsStatusWidgetProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">My Grant Applications</h3>
        <Link
          href="/grants/my-applications"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View All →
        </Link>
      </div>

      {statusCounts.total > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Applications</span>
            <span className="font-semibold text-gray-900">{statusCounts.total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">In Process</span>
            <span className="font-semibold text-yellow-600">{statusCounts.in_process}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Approved</span>
            <span className="font-semibold text-green-600">{statusCounts.approved}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Funded</span>
            <span className="font-semibold text-purple-600">{statusCounts.funded}</span>
          </div>

          <Link
            href="/grants/apply"
            className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium mt-4"
          >
            + New Application
          </Link>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-500 mb-4">No grant applications yet</p>
          <Link
            href="/grants/apply"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Apply for a Grant
          </Link>
        </div>
      )}
    </div>
  )
}