import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
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
  MapPin,
} from "lucide-react";

export const metadata = {
  title: "Travel Perks",
  description: "Exclusive travel deals and discounts for NFW members.",
};

export default async function TravelComingSoonPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const travelFeatures = [
    {
      icon: Hotel,
      title: "Hotels",
      description: "Exclusive rates at thousands of hotels worldwide",
      color: "bg-nfw-lilac",
    },
    {
      icon: Plane,
      title: "Flights",
      description: "Discounted airfare to destinations everywhere",
      color: "bg-nfw-citrine",
    },
    {
      icon: Car,
      title: "Car Rentals",
      description: "Save on rental cars from top providers",
      color: "bg-[#d4f1ad]",
    },
    {
      icon: Ship,
      title: "Cruises",
      description: "Special deals on cruise vacations",
      color: "bg-nfw-lilac",
    },
    {
      icon: Ticket,
      title: "Theme Parks",
      description: "Discounted tickets to 100+ attractions",
      color: "bg-nfw-citrine",
    },
    {
      icon: Calendar,
      title: "Events",
      description: "Access to concerts, sports & more",
      color: "bg-[#d4f1ad]",
    },
  ];

  return (
    <div className="min-h-screen bg-nfw-dove">
      <div className="bg-white border-b border-nfw-blackberry/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/perks"
            className="inline-flex items-center gap-2 text-nfw-blackberry/60 hover:text-nfw-blackberry transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Perks
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-citrine/30 border border-nfw-citrine mb-6">
            <Sparkles className="w-4 h-4 text-nfw-blackberry" />
            <span className="text-sm font-medium text-nfw-blackberry">
              Coming Soon
            </span>
          </div>

          <div className="w-24 h-24 mx-auto mb-6 bg-nfw-lilac border border-nfw-blackberry/10 flex items-center justify-center">
            <MapPin className="w-12 h-12 text-nfw-blackberry" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-nfw-blackberry mb-4 font-serif">
            Travel Perks
          </h1>
          <p className="text-lg text-nfw-blackberry/70 max-w-2xl mx-auto mb-8">
            We&apos;re putting the finishing touches on an amazing travel
            experience just for NFW members. Get ready for exclusive discounts
            on hotels, flights, car rentals, cruises, theme parks, and more!
          </p>

          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-nfw-blackberry/10">
            <Calendar className="w-5 h-5 text-nfw-blackberry" />
            <span className="text-nfw-blackberry font-medium">
              Expected Launch: Spring 2026
            </span>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-semibold text-nfw-blackberry text-center mb-6 font-ui">
            What&apos;s Coming
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {travelFeatures.map((feature) => (
              <div
                key={feature.title}
                className="bg-white border border-nfw-blackberry/10 p-5 text-center"
              >
                <div
                  className={`w-12 h-12 mx-auto mb-3 ${feature.color} flex items-center justify-center`}
                >
                  <feature.icon className="w-6 h-6 text-nfw-blackberry" />
                </div>
                <h3 className="font-semibold text-nfw-blackberry mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-nfw-blackberry/60">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-nfw-blackberry p-8 text-center text-white">
          <Bell className="w-10 h-10 mx-auto mb-4 opacity-90" />
          <h3 className="text-xl font-semibold mb-2">Be the First to Know</h3>
          <p className="text-white/80 mb-6 max-w-md mx-auto">
            We&apos;ll notify you as soon as Travel Perks launches. In the
            meantime, check out our other member benefits!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/perks"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-nfw-blackberry font-medium hover:bg-white/90 transition-colors"
            >
              <Ticket className="w-5 h-5" />
              Browse Current Perks
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-medium hover:bg-white/20 transition-colors border border-white/20"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white border border-nfw-blackberry/10 p-4">
            <p className="text-2xl font-bold text-nfw-blackberry">100+</p>
            <p className="text-sm text-nfw-blackberry/60">Theme Parks</p>
          </div>
          <div className="bg-white border border-nfw-blackberry/10 p-4">
            <p className="text-2xl font-bold text-nfw-blackberry">1000s</p>
            <p className="text-sm text-nfw-blackberry/60">Hotels</p>
          </div>
          <div className="bg-white border border-nfw-blackberry/10 p-4">
            <p className="text-2xl font-bold text-nfw-blackberry">50+</p>
            <p className="text-sm text-nfw-blackberry/60">Car Rental Partners</p>
          </div>
        </div>
      </div>
    </div>
  );
}
