import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import TemplateManagerClient from "./TemplateManagerClient";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function TemplatesPage() {
  const { user } = await requireAdmin();

  const { data: templates } = await supabaseAdmin
    .from("section_templates")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name");

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-6xl mx-auto">
        <TemplateManagerClient
          initialTemplates={templates ?? []}
          userId={user.id}
        />
      </div>
    </main>
  );
}