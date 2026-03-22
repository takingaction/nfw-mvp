import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CategoryForm from "@/components/CategoryForm";

export default async function NewCategoryPage() {
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

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-nfw-blackberry font-serif">Add New Category</h1>
        <div className="bg-white border border-nfw-blackberry/10 p-8">
          <CategoryForm />
        </div>
      </div>
    </main>
  );
}
