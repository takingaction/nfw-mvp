import PerksGrid from '../../components/PerksGrid'

export default function PerksPage() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Member Perks</h1>
        <p className="text-gray-600 mb-8">
          Exclusive discounts and offers for NFW members. Enter your ZIP code to find deals near you.
        </p>
        <PerksGrid />
      </div>
    </main>
  )
}