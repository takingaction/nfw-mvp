import MembershipSelector from '../../components/MembershipSelector'

export default function MembershipPage() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Choose Your Membership</h1>
        <p className="text-gray-600 text-center mb-8">
          Support NFW and unlock exclusive member benefits
        </p>
        <MembershipSelector />
      </div>
    </main>
  )
}