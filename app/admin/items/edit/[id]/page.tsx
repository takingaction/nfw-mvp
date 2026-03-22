import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ItemForm from "@/components/ItemForm";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // Fetch the item
  const { data: item, error } = await supabase
    .from("zero_dollar_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !item) {
    notFound();
  }

  // Fetch categories
  const { data: categories } = await supabase
    .from("zero_dollar_categories")
    .select("*")
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-nfw-blackberry font-serif">Edit Item</h1>
          <a
            href={`/store?item=${item.id}`}
            target="_blank"
            className="text-nfw-blackberry hover:text-nfw-blackberry/70 font-medium"
          >
            View in Store
          </a>
        </div>
        <div className="bg-white border border-nfw-blackberry/10 p-8">
          <ItemForm categories={categories || []} item={item} />
        </div>
      </div>
    </main>
  );
}
