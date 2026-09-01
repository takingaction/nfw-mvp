import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import HeaderEditorClient from "@/components/admin/HeaderEditorClient";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminHeaderPage() {
  await requireAdmin({ redirectOnFailure: true });

  const { data: header } = await supabaseAdmin
    .from("site_header")
    .select("*")
    .single();

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-nfw-blackberry mb-2 font-serif">
            Edit Header
          </h1>
          <p className="text-nfw-blackberry/60">
            Manage navigation links and header CTA
          </p>
        </div>
        <HeaderEditorClient initialData={header} />
      </div>
    </main>
  );
}
