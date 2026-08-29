import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import SignupEditorClient from "@/components/admin/SignupEditorClient";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminSignupPage() {
  await requireAdmin();

  const { data: signup } = await supabaseAdmin
    .from("site_signup")
    .select("*")
    .limit(1)
    .single();

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-nfw-blackberry mb-2 font-serif">
            Edit Signup Page
          </h1>
          <p className="text-nfw-blackberry/60">
            Manage the sidebar content on the signup page
          </p>
        </div>
        <SignupEditorClient initialData={signup || null} />
      </div>
    </main>
  );
}
