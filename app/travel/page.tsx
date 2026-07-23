import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TravelClient from "./TravelClient";

export const metadata = {
  title: "Travel Benefits",
  description: "Book hotels, cars, flights, and more with your NFW membership.",
};

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export default async function TravelPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getUser();

  if (!user) {
    const nextUrl = searchParams?.next || "/travel";
    redirect(`/auth/login?next=${encodeURIComponent(nextUrl)}`);
  }

  // Fetch profile to get optional data for Access Travel
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] || undefined;
  const lastName = profile?.full_name?.split(" ").slice(1).join(" ") || undefined;

  return (
    <TravelClient
      userId={user.id}
      userEmail={user.email || undefined}
      firstName={firstName}
      lastName={lastName}
    />
  );
}