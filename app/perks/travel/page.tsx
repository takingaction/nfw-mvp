import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft,
  Plane,
  Hotel,
  Car,
  Ship,
  Ticket,
  Calendar,
  Bell,
  Sparkles,
  MapPin
} from 'lucide-react'

export default async function TravelComingSoonPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  const travelFeatures = [
    {
      icon: Hotel,
      title: 'Hotels',
      description: 'Exclusive rates at thousands of hotels worldwide',
      color: 'bg-[#BCAFCF]'
    },
    {
      icon: Plane,
      title: 'Flights',
      description: 'Discounted airfare to destinations everywhere',
      color: 'bg-[#fdf493]'
    },
    {
      icon: Car,
      title: 'Car Rentals',
      description: 'Save on rental cars from top providers',
      color: 'bg-[#d4f1ad]'
    },
    {
      icon: Ship,
      title: 'Cruises',
      description: 'Special deals on cruise vacations',
      color: 'bg-[#BCAFCF]'
    },
    {
      icon: Ticket,
      title: 'Theme Parks',
      description: 'Discounted tickets to 100+ attractions',
      color: 'bg-[#fdf493]'
    },
    {
      icon: Calendar,
      title: 'Events',
      description: 'Access to concerts, sports & more',
      color: 'bg-[#d4f1ad]'
    },
  ]

  return (
    <div className="min-h-screen bg-[#f8f7fa]">
      {/* Header */}
      <div className="bg-white border-b border-[#2d1239]/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/perks"
            className="inline-flex items-center gap-2 text-[#2d1239]/60 hover:text-[#2d1239] transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Perks
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fdf493]/30 border border-[#fdf493] rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-[#2d1239]" />
            <span className="text-sm font-medium text-[#2d1239]">Coming Soon</span>
          </div>

          {/* Main Icon */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#BCAFCF] to-[#2d1239] flex items-center justify-center shadow-lg">
            <MapPin className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[#2d1239] mb-4">
            Travel Perks
          </h1>
          <p className="text-lg text-[#2d1239]/70 max-w-2xl mx-auto mb-8">
            We&apos;re putting the finishing touches on an amazing travel experience just for NFW members. 
            Get ready for exclusive discounts on hotels, flights, car rentals, cruises, theme parks, and more!
          </p>

          {/* Launch Timeline */}
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-xl border border-[#2d1239]/10 shadow-sm">
            <Calendar className="w-5 h-5 text-[#2d1239]" />
            <span className="text-[#2d1239] font-medium">Expected Launch: Spring 2026</span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-[#2d1239] text-center mb-6">
            What&apos;s Coming
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {travelFeatures.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl border border-[#2d1239]/10 p-5 text-center hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl ${feature.color} flex items-center justify-center`}>
                  <feature.icon className="w-6 h-6 text-[#2d1239]" />
                </div>
                <h3 className="font-semibold text-[#2d1239] mb-1">{feature.title}</h3>
                <p className="text-sm text-[#2d1239]/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notification CTA */}
        <div className="bg-gradient-to-r from-[#2d1239] to-[#4a1d5e] rounded-2xl p-8 text-center text-white">
          <Bell className="w-10 h-10 mx-auto mb-4 opacity-90" />
          <h3 className="text-xl font-semibold mb-2">Be the First to Know</h3>
          <p className="text-white/80 mb-6 max-w-md mx-auto">
            We&apos;ll notify you as soon as Travel Perks launches. In the meantime, check out our other member benefits!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/perks"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#2d1239] rounded-xl font-medium hover:bg-white/90 transition-colors"
            >
              <Ticket className="w-5 h-5" />
              Browse Current Perks
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors border border-white/20"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Stats Preview */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-xl border border-[#2d1239]/10 p-4">
            <p className="text-2xl font-bold text-[#2d1239]">100+</p>
            <p className="text-sm text-[#2d1239]/60">Theme Parks</p>
          </div>
          <div className="bg-white rounded-xl border border-[#2d1239]/10 p-4">
            <p className="text-2xl font-bold text-[#2d1239]">1000s</p>
            <p className="text-sm text-[#2d1239]/60">Hotels</p>
          </div>
          <div className="bg-white rounded-xl border border-[#2d1239]/10 p-4">
            <p className="text-2xl font-bold text-[#2d1239]">50+</p>
            <p className="text-sm text-[#2d1239]/60">Car Rental Partners</p>
          </div>
        </div>
      </div>
    </div>
  )
}