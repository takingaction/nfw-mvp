"use client";

import { useState, useEffect } from "react";
import { X, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { ArticleCategory } from "@/types/articles";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChange?: () => void;
}

const DEFAULT_COLORS = [
  "#3E145F", // aubergine
  "#7786BE", // wisteria
  "#B693C0", // lilac
  "#2E1F38", // blackberry
  "#F8F19A", // citrine
  "#9CA6D2", // powder
];

const EMOJI_OPTIONS = ["📚", "💼", "🎯", "✨", "🌟", "💪", "🤝", "💜", "🧡", "💚", "🔵", "🟣"];

export default function ArticleCategoryManager({
  isOpen,
  onClose,
  onCategoriesChange,
}: Props) {
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "📚",
    color: "#3E145F",
    display_order: 0,
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/articles/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/articles/categories/${editingId}`
        : "/api/admin/articles/categories";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchCategories();
        resetForm();
        onCategoriesChange?.();
      }
    } catch (err) {
      console.error("Failed to save category:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: ArticleCategory) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      icon: category.icon || "📚",
      color: category.color || "#3E145F",
      display_order: category.display_order,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/articles/categories/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchCategories();
        setDeleteConfirmId(null);
        onCategoriesChange?.();
      }
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      icon: "📚",
      color: "#3E145F",
      display_order: 0,
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newCategories = [...categories];
    const [draggedItem] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(index, 0, draggedItem);
    setCategories(newCategories);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);

    // Save new order
    try {
      await Promise.all(
        categories.map((cat, index) =>
          fetch(`/api/admin/articles/categories/${cat.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ display_order: index }),
          }),
        ),
      );
      onCategoriesChange?.();
    } catch (err) {
      console.error("Failed to save order:", err);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-nfw-blackberry font-serif">
            Manage Categories
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-nfw-blackberry mb-4 font-ui">
              {editingId ? "Edit Category" : "Add New Category"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-nfw-blackberry mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: editingId ? formData.slug : generateSlug(e.target.value),
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-nfw-aubergine/50"
                  placeholder="Category name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-nfw-blackberry mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-nfw-aubergine/50"
                  placeholder="category-slug"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-nfw-blackberry mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-nfw-aubergine/50"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-nfw-blackberry mb-1">
                    Icon
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: emoji })}
                        className={`w-8 h-8 text-lg flex items-center justify-center rounded ${
                          formData.icon === emoji
                            ? "bg-nfw-aubergine text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-nfw-blackberry mb-1">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded ${
                          formData.color === color ? "ring-2 ring-offset-2 ring-nfw-blackberry" : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-nfw-blackberry hover:bg-gray-200 rounded transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving || !formData.name.trim()}
                className="px-4 py-2 bg-nfw-blackberry text-white text-sm font-bold hover:bg-nfw-blackberry/90 disabled:opacity-50 rounded transition-colors"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </form>

          {/* Category List */}
          <div>
            <h3 className="font-bold text-nfw-blackberry mb-4 font-ui">
              Existing Categories ({categories.length})
            </h3>

            {loading ? (
              <p className="text-nfw-blackberry/50">Loading...</p>
            ) : categories.length === 0 ? (
              <p className="text-nfw-blackberry/50">No categories yet.</p>
            ) : (
              <div className="space-y-2">
                {categories.map((category, index) => (
                  <div
                    key={category.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 bg-white border rounded-lg ${
                      draggedIndex === index ? "opacity-50" : ""
                    }`}
                  >
                    <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-lg"
                      style={{ backgroundColor: category.color ? `${category.color}20` : "#f3f4f6" }}
                    >
                      {category.icon || "📚"}
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-nfw-blackberry">{category.name}</p>
                      <p className="text-xs text-nfw-blackberry/50">{category.slug}</p>
                    </div>

                    {category.article_count > 0 && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded text-nfw-blackberry/50">
                        {category.article_count} articles
                      </span>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors text-nfw-blackberry/50 hover:text-nfw-blackberry"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deleteConfirmId === category.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-2 hover:bg-gray-100 rounded transition-colors text-nfw-blackberry/50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(category.id)}
                          className="p-2 hover:bg-gray-100 rounded transition-colors text-nfw-blackberry/50 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 bg-nfw-blackberry text-white font-bold hover:bg-nfw-blackberry/90 rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
