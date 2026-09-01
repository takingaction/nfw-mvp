import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import Link from "next/link";
import { LayoutTemplate, Plus, Trash2 } from "lucide-react";
import AdminPagesClient from "@/components/admin/pages/AdminPagesClient";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminPagesPage() {
  await requireAdmin({ redirectOnFailure: true });

  const { data: pages } = await supabaseAdmin
    .from("pages")
    .select("*")
    .order("created_at", { ascending: false });

  return <AdminPagesClient pages={pages || []} />;
}
