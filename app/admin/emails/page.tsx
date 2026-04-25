import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminEmailsClient from "@/components/admin/AdminEmailsClient";

export default async function AdminEmailsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  const { data: templates } = await supabase
    .from("email_templates")
    .select("*")
    .order("category", { ascending: false })
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-7xl mx-auto">
        <AdminEmailsClient
          initialTemplates={templates || []}
          userEmail={user.email}
        />
      </div>
    </main>
  );
}