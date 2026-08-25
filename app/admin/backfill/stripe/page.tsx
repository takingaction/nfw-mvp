import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function BackfillStripePage() {
  const supabase = await createClient();

  // Check if user is logged in
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/auth/login?next=/admin/backfill/stripe");
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", session.user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-nfw-dove">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <a href="/admin" className="text-nfw-aubergine hover:underline font-ui text-sm">
            ← Back to Admin
          </a>
        </div>

        <h1 className="font-serif text-3xl text-nfw-aubergine mb-2">
          Stripe Revenue Backfill
        </h1>
        <p className="font-serif text-nfw-blackberry/70 mb-8">
          Match Stripe customers to profiles and calculate lifetime value
        </p>

        <BackfillClient />
      </div>
    </div>
  );
}

import BackfillClient from "./BackfillClient";
