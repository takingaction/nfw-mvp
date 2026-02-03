import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ManageSubscription from '../../components/ManageSubscription'
import ProfileCompletionForm from '../../components/ProfileCompletionForm'

export default async function ProfilePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  const membershipLevel = profile?.membership_level || 'free'

  // Format membership display
  const membershipDisplay: Record<string, { label: string; color: string }> = {
    free: { label: 'Free Member', color: 'bg-gray-100 text-gray-800' },
    contributing: { label: 'Contributing Member', color: 'bg-blue-100 text-blue-800' },
    founding: { label: 'Founding Member', color: 'bg-purple-100 text-purple-800' },
  }

  const currentMembership = membershipDisplay[membershipLevel] || membershipDisplay.free

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
          <p className="text-gray-600">
            Manage your NFW membership and profile information.
          </p>
        </div>

        {/* Membership Status Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">Membership Status</h2>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${currentMembership.color}`}>
                {currentMembership.label}
              </span>
            </div>
            <ManageSubscription membershipLevel={membershipLevel} />
          </div>

          {membershipLevel === 'free' && (
            <p className="text-sm text-gray-500 mt-4">
              Upgrade your membership to unlock exclusive perks and support NFW's mission.
            </p>
          )}
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
          
          {profile ? (
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Full Name</span>
                <p className="font-medium">{profile.full_name || 'Not set'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Email</span>
                <p className="font-medium">{session.user.email}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Location</span>
                <p className="font-medium">
                  {profile.city && profile.state 
                    ? `${profile.city}, ${profile.state} ${profile.zip || ''}`
                    : 'Not set'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Member Since</span>
                <p className="font-medium">
                  {profile.joined_at 
                    ? new Date(profile.joined_at).toLocaleDateString()
                    : new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Complete your profile below.</p>
          )}
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {profile ? 'Update Your Profile' : 'Complete Your Profile'}
          </h2>
          <ProfileCompletionForm userId={session.user.id} />
        </div>
      </div>
    </main>
  )
}