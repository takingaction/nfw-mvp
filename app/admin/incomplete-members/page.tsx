import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminIncompleteMembersClient from "./AdminIncompleteMembersClient";

export default async function AdminIncompleteMembersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  return <AdminIncompleteMembersClient />;
}