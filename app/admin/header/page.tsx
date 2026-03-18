import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import HeaderEditorClient from "@/components/admin/HeaderEditorClient";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminHeaderPage() {
  await requireAdmin();

  const { data: header } = await supabaseAdmin
    .from("site_header")
    .select("*")
    .single();

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#2d1239] mb-2">
            Edit Header
          </h1>
          <p className="text-gray-600">
            Manage navigation links and header CTA
          </p>
        </div>
        <HeaderEditorClient initialData={header} />
      </div>
    </main>
  );
}
