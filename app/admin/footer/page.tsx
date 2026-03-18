import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import FooterEditorClient from "@/components/admin/FooterEditorClient";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminFooterPage() {
  await requireAdmin();

  const { data: footer } = await supabaseAdmin
    .from("site_footer")
    .select("*")
    .single();

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#2d1239] mb-2">
            Edit Footer
          </h1>
          <p className="text-gray-600">
            Manage footer columns, social links, and legal links
          </p>
        </div>
        <FooterEditorClient initialData={footer} />
      </div>
    </main>
  );
}
