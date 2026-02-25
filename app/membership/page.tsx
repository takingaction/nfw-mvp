import MembershipSelector from '../../components/MembershipSelector'

export const metadata = {
  title: 'Membership',
  description: 'Join the National Fund for Women and unlock microgrants, 1,000+ perks, the Zero Dollar Store, and more.',
  openGraph: {
    title: 'Membership | National Fund for Women',
    description: 'Join NFW and unlock microgrants, perks, and more.',
    url: 'https://nationalfundforwomen.org/membership',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630 }],
  },
}

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