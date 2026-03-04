import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import DeleteItemButton from "@/components/DeleteItemButton";

export default async function AdminItemsPage() {
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
    redirect("/");
  }

  const { data: items, error: itemsError } = await supabase
    .from("zero_dollar_items")
    .select(
      `
      *,
      category:zero_dollar_categories(name, slug)
    `,
    )
    .order("created_at", { ascending: false });

  if (itemsError) {
    console.error("Error fetching items:", itemsError);
    return (
      <main className="min-h-screen p-8 bg-[#f8f7fa]">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-4 text-red-600">
            Error Loading Items
          </h1>
          <pre className="bg-white p-6 rounded-xl border border-[#2d1239]/10">
            {JSON.stringify(itemsError, null, 2)}
          </pre>
        </div>
      </main>
    );
  }

  const { data: categories } = await supabase
    .from("zero_dollar_categories")
    .select("*")
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen p-8 bg-[#f8f7fa]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-3xl font-bold text-[#2d1239]"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Manage Store Items
            </h1>
            <p className="text-[#2d1239]/50 mt-1 text-sm">
              Add, edit, and manage Zero Dollar Store inventory
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/categories"
              className="bg-white border border-[#2d1239]/20 text-[#2d1239] px-5 py-2.5 rounded-xl hover:bg-[#2d1239]/5 font-medium transition-colors text-sm"
            >
              Manage Categories
            </Link>
            <Link
              href="/admin/items/new"
              className="bg-[#2d1239] text-white px-5 py-2.5 rounded-xl hover:bg-[#2d1239]/90 font-medium transition-colors text-sm"
            >
              + New Item
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-[#2d1239]/10 p-5">
            <div className="text-3xl font-bold text-[#2d1239]">
              {items?.length || 0}
            </div>
            <div className="text-[#2d1239]/50 text-sm mt-1">Total Items</div>
          </div>
          <div className="bg-white rounded-xl border border-[#2d1239]/10 p-5">
            <div className="text-3xl font-bold text-[#2d1239]">
              {items?.filter((i) => i.is_active).length || 0}
            </div>
            <div className="text-[#2d1239]/50 text-sm mt-1">Active Items</div>
            <div className="mt-2 h-1 w-8 rounded-full bg-[#d4f1ad]" />
          </div>
          <div className="bg-white rounded-xl border border-[#2d1239]/10 p-5">
            <div className="text-3xl font-bold text-[#2d1239]">
              {items?.filter((i) => i.quantity_available === 0).length || 0}
            </div>
            <div className="text-[#2d1239]/50 text-sm mt-1">Out of Stock</div>
            <div className="mt-2 h-1 w-8 rounded-full bg-[#fdf493]" />
          </div>
          <div className="bg-white rounded-xl border border-[#2d1239]/10 p-5">
            <div className="text-3xl font-bold text-[#2d1239]">
              {categories?.length || 0}
            </div>
            <div className="text-[#2d1239]/50 text-sm mt-1">Categories</div>
            <div className="mt-2 h-1 w-8 rounded-full bg-[#BCAFCF]" />
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl border border-[#2d1239]/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f8f7fa] border-b border-[#2d1239]/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#2d1239]/50 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#2d1239]/50 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#2d1239]/50 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#2d1239]/50 uppercase tracking-wider">
                  Inventory
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#2d1239]/50 uppercase tracking-wider">
                  Claims
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#2d1239]/50 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d1239]/5">
              {items?.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-[#f8f7fa] transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {item.image_url ? (
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-[#2d1239]/10">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-[#BCAFCF]/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">📦</span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-[#2d1239]">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-sm text-[#2d1239]/40 line-clamp-1 max-w-xs">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.category?.name ? (
                      <span className="text-sm bg-[#BCAFCF]/20 text-[#2d1239] px-2.5 py-1 rounded-full font-medium">
                        {item.category.name}
                      </span>
                    ) : (
                      <span className="text-sm text-[#2d1239]/30">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                        item.is_active
                          ? "bg-[#d4f1ad] text-[#2d1239]"
                          : "bg-[#2d1239]/10 text-[#2d1239]/50"
                      }`}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div
                        className={`font-medium ${
                          item.quantity_available === 0
                            ? "text-red-500"
                            : "text-[#2d1239]"
                        }`}
                      >
                        {item.quantity_available} available
                      </div>
                      {item.quantity_claimed > 0 && (
                        <div className="text-[#2d1239]/40 text-xs mt-0.5">
                          {item.quantity_claimed} claimed
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#2d1239]/60 font-medium">
                    {item.quantity_claimed}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/items/edit/${item.id}`}
                        className="text-[#2d1239] hover:text-[#2d1239]/70 font-medium underline underline-offset-2 transition-colors"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/store?item=${item.id}`}
                        target="_blank"
                        className="text-[#2d1239]/50 hover:text-[#2d1239] font-medium underline underline-offset-2 transition-colors"
                      >
                        View
                      </Link>
                      <DeleteItemButton itemId={item.id} itemName={item.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {items?.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📦</div>
              <p className="text-[#2d1239]/50 mb-6">
                No items yet. Add your first item!
              </p>
              <Link
                href="/admin/items/new"
                className="inline-block bg-[#2d1239] text-white px-6 py-2.5 rounded-xl hover:bg-[#2d1239]/90 font-medium transition-colors text-sm"
              >
                + Add First Item
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
