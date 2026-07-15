import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminWaitlistClient from "./AdminWaitlistClient";

export default async function AdminWaitlistPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-nfw-dove">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-nfw-blackberry font-serif">
              Waitlist Management
            </h1>
            <p className="text-nfw-blackberry/60 text-lg">
              Manage waitlist members and send welcome emails
            </p>
          </div>
          <a
            href="/api/admin/waitlist/export"
            className="px-4 py-2 border border-nfw-blackberry/20 text-nfw-blackberry font-medium hover:bg-nfw-blackberry/5 transition-colors text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV
          </a>
        </div>
        <AdminWaitlistClient />
      </div>
    </main>
  );
}