import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminWaitlistClient from "./AdminWaitlistClient";

export default async function AdminWaitlistPage() {
  const supabase = await createClient();

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
    redirect("/");
  }

  return <AdminWaitlistClient />;
}