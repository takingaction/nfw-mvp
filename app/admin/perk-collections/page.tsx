import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminPerkCollections from "./AdminPerkCollections";

export default async function AdminPerkCollectionsPage() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
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

  return <AdminPerkCollections />;
}
