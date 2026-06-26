"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";

type NfwPerk = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  partner_name: string | null;
  partner_logo_url: string | null;
  landing_page_url: string | null;
  estimated_value: number | null;
  terms_and_conditions: string | null;
  per_user_limit: number;
  expires_at: string | null;
  is_active: boolean;
  categories: string[];
  redemptionCount: number;
  created_at: string;
};

const PERK_CATEGORIES = [
  "Auto, Gas, & Car Rental",
  "Business & Office",
  "Condos & Resorts",
  "Cruises & Tours",
  "Dining & Food",
  "Entertainment & Recreation",
  "Health & Beauty",
  "Home & Garden",
  "Hotel",
  "Movies",
  "Services",
  "Shopping",
  "Travel",
];

export default function AdminNfwPerks() {
  const [perks, setPerks] = useState<NfwPerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPerk, setEditingPerk] = useState<NfwPerk | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [mediaLibraryCallback, setMediaLibraryCallback] = useState<((url: string) => void) | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    partner_name: "",
    partner_logo_url: "",
    landing_page_url: "",
    estimated_value: "" as string | number,
    terms_and_conditions: "",
    per_user_limit: 1,
    expires_at: "",
    is_active: true,
    categories: [] as string[],
  });

  useEffect(() => {
    fetchPerks();
  }, []);

  async function fetchPerks() {
    try {
      const res = await fetch("/api/admin/nfw-perks");
      const data = await res.json();
      if (data.perks) {
        setPerks(data.perks);
      }
    } catch (err) {
      console.error("Error fetching perks:", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingPerk(null);
    setFormData({
      title: "",
      slug: "",
      description: "",
      partner_name: "",
      partner_logo_url: "",
      landing_page_url: "",
      estimated_value: "",
      terms_and_conditions: "",
      per_user_limit: 1,
      expires_at: "",
      is_active: true,
      categories: [],
    });
    setSlugManuallyEdited(false);
    setShowModal(true);
  }

  function openEditModal(perk: NfwPerk) {
    setEditingPerk(perk);
    setFormData({
      title: perk.title,
      slug: perk.slug || "",
      description: perk.description || "",
      partner_name: perk.partner_name || "",
      partner_logo_url: perk.partner_logo_url || "",
      landing_page_url: perk.landing_page_url || "",
      estimated_value: perk.estimated_value || "",
      terms_and_conditions: perk.terms_and_conditions || "",
      per_user_limit: perk.per_user_limit,
      expires_at: perk.expires_at ? perk.expires_at.split("T")[0] : "",
      is_active: perk.is_active,
      categories: perk.categories || [],
    });
    setSlugManuallyEdited(true);
    setShowModal(true);
  }

  function openMediaLibrary(callback: (url: string) => void) {
    setMediaLibraryCallback(() => callback);
    setMediaLibraryOpen(true);
  }

  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  async function handleSave() {
    if (!formData.title) {
      setError("Title is required");
      return;
    }

    if (!formData.slug) {
      setError("URL slug is required");
      return;
    }

    if (!formData.landing_page_url) {
      setError("Landing page URL is required");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      title: formData.title,
      slug: formData.slug || null,
      description: formData.description || null,
      partner_name: formData.partner_name || null,
      partner_logo_url: formData.partner_logo_url || null,
      landing_page_url: formData.landing_page_url || null,
      estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
      terms_and_conditions: formData.terms_and_conditions || null,
      per_user_limit: formData.per_user_limit,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      is_active: formData.is_active,
      categories: formData.categories,
    };

    try {
      const url = editingPerk ? `/api/admin/nfw-perks/${editingPerk.id}` : "/api/admin/nfw-perks";
      const method = editingPerk ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setShowModal(false);
      fetchPerks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/nfw-perks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      setDeleteConfirm(null);
      fetchPerks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-nfw-stone/20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-nfw-blackberry font-serif">NFW Exclusive Perks</h1>
          <p className="text-nfw-blackberry/60 font-ui text-sm mt-1">Manage exclusive member perks</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-nfw-aubergine text-white font-ui text-sm font-medium hover:bg-nfw-aubergine/90"
        >
          <Plus className="w-4 h-4" />
          Add Perk
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-800 font-ui text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
        <table className="min-w-full divide-y divide-nfw-blackberry/5">
          <thead className="bg-nfw-dove">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider font-ui">
                Perk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider font-ui">
                Partner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider font-ui">
                Est. Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider font-ui">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider font-ui">
                Redeemed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider font-ui">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-nfw-blackberry/5">
            {perks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-nfw-blackberry/50 font-ui">
                  No perks yet. Click &quot;Add Perk&quot; to create one.
                </td>
              </tr>
            ) : (
              perks.map((perk) => (
                <tr key={perk.id} className={!perk.is_active ? "bg-nfw-stone/5" : ""}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-nfw-blackberry font-ui">{perk.title}</div>
                    {perk.slug && (
                      <a
                        href={`/perks/nfw/${perk.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-nfw-aubergine hover:underline font-ui mt-0.5 inline-block"
                      >
                        /perks/nfw/{perk.slug}
                      </a>
                    )}
                    {perk.categories && perk.categories.length > 0 && (
                      <div className="text-xs text-nfw-blackberry/50 font-ui mt-0.5">
                        {perk.categories.slice(0, 2).join(", ")}
                        {perk.categories.length > 2 && ` +${perk.categories.length - 2}`}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-nfw-blackberry/70 font-ui text-sm">
                    {perk.partner_name || "—"}
                  </td>
                  <td className="px-6 py-4 text-nfw-blackberry/70 font-ui text-sm">
                    {perk.estimated_value ? `$${perk.estimated_value.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium font-ui ${
                        perk.is_active
                          ? "bg-[#d4f1ad] text-nfw-blackberry"
                          : "bg-nfw-stone/20 text-nfw-blackberry/50"
                      }`}
                    >
                      {perk.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-nfw-blackberry/70 font-ui text-sm">
                    {perk.redemptionCount}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(perk)}
                        className="p-2 text-nfw-blackberry/30 hover:text-nfw-aubergine hover:bg-nfw-aubergine/10 rounded transition-colors"
                        title="Edit perk"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(perk.id)}
                        className="p-2 text-nfw-blackberry/30 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete perk"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-nfw-blackberry/50">
          <div className="bg-white w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-nfw-blackberry/10">
              <h3 className="text-lg font-bold text-nfw-blackberry font-serif">
                {editingPerk ? "Edit Perk" : "Add Perk"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-nfw-blackberry/50 hover:text-nfw-blackberry"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-800 font-ui text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-nfw-blackberry mb-1 font-ui">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      title: newTitle,
                      slug: slugManuallyEdited ? prev.slug : newTitle
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                    }));
                  }}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry font-ui"
                  placeholder="e.g., 20% off at Partner Store"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-nfw-blackberry mb-1 font-ui">
                  URL Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") });
                  }}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry font-ui"
                  placeholder="e.g., summer-sale"
                />
                <p className="text-xs text-nfw-blackberry/50 mt-1 font-ui">
                  URL: /perks/nfw/{formData.slug || "your-slug"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-nfw-blackberry mb-1 font-ui">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry font-ui resize-none"
                  placeholder="Optional description shown to members"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-nfw-blackberry mb-1 font-ui">
                    Partner Name
                  </label>
                  <input
                    type="text"
                    value={formData.partner_name}
                    onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry font-ui"
                    placeholder="e.g., Partner Store"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-nfw-blackberry mb-1 font-ui">
                    Partner Logo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.partner_logo_url}
                      onChange={(e) => setFormData({ ...formData, partner_logo_url: e.target.value })}
                      className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry font-ui"
                      placeholder="https://..."
                    />
                    <button
                      onClick={() => openMediaLibrary((url) => setFormData({ ...formData, partner_logo_url: url }))}
                      className="px-3 py-2 bg-nfw-stone/20 text-nfw-blackberry text-sm font-ui hover:bg-nfw-stone/30"
                    >
                      Browse
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-nfw-blackberry mb-1 font-ui">
                  Landing Page URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.landing_page_url}
                  onChange={(e) => setFormData({ ...formData, landing_page_url: e.target.value })}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry font-ui"
                  placeholder="https://partner.com/special-offer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-nfw-blackberry mb-1 font-ui">
                    Estimated Value ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry font-ui"
                    placeholder="e.g., 25.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-nfw-blackberry mb-1 font-ui">
                    Per-User Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.per_user_limit}
                    onChange={(e) => setFormData({ ...formData, per_user_limit: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry font-ui"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-nfw-blackberry mb-1 font-ui">
                    Expires At
                  </label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry font-ui"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-nfw-blackberry mb-1 font-ui">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {PERK_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-ui rounded-full border transition-colors ${
                        formData.categories.includes(category)
                          ? "bg-nfw-aubergine text-white border-nfw-aubergine"
                          : "bg-white text-nfw-blackberry/70 border-nfw-blackberry/20 hover:border-nfw-blackberry/40"
                      }`}
                    >
                      {formData.categories.includes(category) && <Check className="w-3 h-3" />}
                      {category}
                    </button>
                  ))}
                </div>
                {formData.categories.length === 0 && (
                  <p className="text-xs text-nfw-blackberry/50 mt-1 font-ui">Select at least one category</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-nfw-blackberry mb-1 font-ui">
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.terms_and_conditions}
                  onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry font-ui resize-none"
                  placeholder="Optional terms and conditions shown to members"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm text-nfw-blackberry font-ui">
                  Active
                </label>
              </div>
            </div>

            <div className="flex gap-3 justify-end px-6 py-4 border-t border-nfw-blackberry/10">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-nfw-blackberry/60 hover:text-nfw-blackberry font-ui"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-nfw-aubergine text-white text-sm font-medium hover:bg-nfw-aubergine/90 disabled:opacity-50 font-ui"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-nfw-blackberry/50">
          <div className="bg-white w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-nfw-blackberry font-serif mb-2">Delete Perk?</h3>
            <p className="text-nfw-blackberry/70 font-ui text-sm mb-6">
              Are you sure you want to delete this perk? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-nfw-blackberry/60 hover:text-nfw-blackberry font-ui"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 font-ui"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <MediaLibraryModal
        isOpen={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        onSelect={(url) => {
          if (mediaLibraryCallback) {
            mediaLibraryCallback(url);
          }
          setMediaLibraryOpen(false);
        }}
        bucket="page-builder"
      />
    </div>
  );
}
