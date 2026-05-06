import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import AdminNewsletterSignups from "./AdminNewsletterSignups";

export const dynamic = "force-dynamic";

async function getEmails() {
  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: emails, error } = await supabaseAdmin
    .from("coming_soon_emails")
    .select("email, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching emails:", error);
    return [];
  }

  return emails || [];
}

export default async function AdminNewsletterSignupsPage() {
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
    redirect("/dashboard");
  }

  const emails = await getEmails();

  return <AdminNewsletterSignups initialEmails={emails} />;
}