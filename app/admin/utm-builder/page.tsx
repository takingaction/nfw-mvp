import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminUtmBuilder from "./AdminUtmBuilder";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  return <AdminUtmBuilder userEmail={profile?.email || ""} />;
}
