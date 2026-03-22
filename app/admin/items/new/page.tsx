import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ItemForm from "@/components/ItemForm";

export default async function NewItemPage() {
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

  // Fetch categories
  const { data: categories } = await supabase
    .from("zero_dollar_categories")
    .select("*")
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-nfw-blackberry font-serif">Add New Item</h1>
        <div className="bg-white border border-nfw-blackberry/10 p-8">
          <ItemForm categories={categories || []} />
        </div>
      </div>
    </main>
  );
}
