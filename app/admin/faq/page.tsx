import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import FaqEditorClient from "@/components/admin/FaqEditorClient";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminFaqPage() {
  await requireAdmin();

  const { data: faq } = await supabaseAdmin
    .from("site_faq")
    .select("*")
    .single();

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-nfw-blackberry mb-2 font-serif">
            Edit FAQ Page
          </h1>
          <p className="text-nfw-blackberry/60">
            Manage hero text, FAQ sections, and call-to-action buttons
          </p>
        </div>
        <FaqEditorClient initialData={faq} />
      </div>
    </main>
  );
}
