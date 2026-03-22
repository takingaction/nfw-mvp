"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CategoryForm({ category }: { category?: any }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: category?.name || "",
    slug: category?.slug || "",
    icon: category?.icon || "",
    display_order: category?.display_order || 0,
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const categoryData = {
        name: formData.name,
        slug: formData.slug,
        icon: formData.icon || null,
        display_order: parseInt(formData.display_order.toString()),
      };

      if (category) {
        // Update existing category
        const { error: updateError } = await supabase
          .from("zero_dollar_categories")
          .update(categoryData)
          .eq("id", category.id);

        if (updateError) throw updateError;
      } else {
        // Create new category
        const { error: insertError } = await supabase
          .from("zero_dollar_categories")
          .insert(categoryData);

        if (insertError) throw insertError;
      }

      router.push("/admin/categories");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      {/* Category Name */}
      <div>
        <label className="block text-sm font-medium text-nfw-blackberry mb-2">
          Category Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full px-4 py-2 border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry focus:ring-2 focus:ring-nfw-lilac"
          placeholder="e.g., Clothing, Electronics"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-nfw-blackberry mb-2">
          Slug *
        </label>
        <input
          type="text"
          required
          value={formData.slug}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, slug: e.target.value }))
          }
          className="w-full px-4 py-2 border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry focus:ring-2 focus:ring-nfw-lilac"
          placeholder="category-url-slug"
        />
        <p className="text-sm text-nfw-blackberry/50 mt-1">
          URL: /store?category={formData.slug || "category-slug"}
        </p>
      </div>

      {/* Icon */}
      <div>
        <label className="block text-sm font-medium text-nfw-blackberry mb-2">
          Icon (Emoji)
        </label>
        <input
          type="text"
          value={formData.icon}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, icon: e.target.value }))
          }
          className="w-full px-4 py-2 border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry focus:ring-2 focus:ring-nfw-lilac"
          placeholder="👕 💻 🏠"
          maxLength={2}
        />
        <p className="text-sm text-nfw-blackberry/50 mt-1">
          Use an emoji to represent this category
        </p>
      </div>

      {/* Display Order */}
      <div>
        <label className="block text-sm font-medium text-nfw-blackberry mb-2">
          Display Order *
        </label>
        <input
          type="number"
          required
          min="0"
          value={formData.display_order}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              display_order: parseInt(e.target.value) || 0,
            }))
          }
          className="w-full px-4 py-2 border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry focus:ring-2 focus:ring-nfw-lilac"
        />
        <p className="text-sm text-nfw-blackberry/50 mt-1">Lower numbers appear first</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-6 border-t border-nfw-blackberry/10">
        <button
          type="submit"
          disabled={loading}
          className="bg-nfw-blackberry text-white px-6 py-3 hover:bg-nfw-blackberry/90 font-medium disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : category
              ? "Update Category"
              : "Create Category"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/categories")}
          className="bg-nfw-dove text-nfw-blackberry px-6 py-3 hover:bg-nfw-blackberry/5 font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
