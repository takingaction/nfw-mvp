import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import FooterEditorClient from "@/components/admin/FooterEditorClient";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminFooterPage() {
  await requireAdmin({ redirectOnFailure: true });

  const { data: footer } = await supabaseAdmin
    .from("site_footer")
    .select("*")
    .single();

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-nfw-blackberry mb-2 font-serif">
            Edit Footer
          </h1>
          <p className="text-nfw-blackberry/60">
            Manage footer columns, social links, and legal links
          </p>
        </div>
        <FooterEditorClient initialData={footer} />
      </div>
    </main>
  );
}
