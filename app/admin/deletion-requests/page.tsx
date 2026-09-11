import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/middleware/adminCheck";
import AdminDeletionRequestsClient from "./AdminDeletionRequestsClient";

export default async function AdminDeletionRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const admin = await requireAdmin();
  if (!admin.authorized) {
    redirect("/");
  }

  return <AdminDeletionRequestsClient />;
}
