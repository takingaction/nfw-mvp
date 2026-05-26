import { createClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EmailBuilderPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Check admin
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
    redirect("/dashboard");
  }

  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("*")
    .eq("slug", slug)
    .single();

  if (templateError || !template) {
    redirect("/admin/emails");
  }

  // Fetch sections using admin client to bypass RLS
  console.log("[builder] Fetching sections for template:", template.id, "slug:", slug);
  const { data: sections } = await supabaseAdmin
    .from("email_sections")
    .select("*")
    .eq("email_template_id", template.id)
    .order("order_index", { ascending: true });

  console.log("[builder] Fetched sections:", sections?.length || 0, sections);

  // Pass to client component
  const EmailBuilderClient = (await import("@/components/admin/email/EmailBuilderClient")).default;

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-nfw-blackberry/10 bg-white">
        <div className="flex items-center gap-4">
          <a
            href="/admin/emails"
            className="text-sm text-nfw-blackberry/60 hover:text-nfw-blackberry"
          >
            ← Back to Emails
          </a>
          <h1 className="text-xl font-serif text-nfw-blackberry">Email Builder</h1>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <EmailBuilderClient template={template} initialSections={sections || []} />
      </div>
    </div>
  );
}