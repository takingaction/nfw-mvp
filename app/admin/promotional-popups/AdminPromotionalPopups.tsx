"use client";

import { useState, useEffect } from "react";
import { X, Plus, Pencil, Trash2, AlertTriangle, Search, ImageIcon } from "lucide-react";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";

interface Popup {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  mobile_label: string | null;
  target_pages: string[];
  frequency_type: string;
  frequency_value: number;
  delay_seconds: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

const AVAILABLE_PAGES = [
  { value: "/", label: "Homepage" },
  { value: "/perks", label: "/perks" },
  { value: "/grants", label: "/grants" },
  { value: "/dashboard", label: "/dashboard" },
  { value: "/store", label: "/store" },
  { value: "/profile", label: "/profile" },
  { value: "/faq", label: "/faq" },
  { value: "/contact", label: "/contact" },
  { value: "/gift-membership", label: "/gift-membership" },
  { value: "/travel", label: "/travel" },
];

const FREQUENCY_OPTIONS = [
  { value: "once", label: "Once (per user)" },
  { value: "per_session", label: "Once per session" },
  { value: "every_visit", label: "Every visit" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

export default function AdminPromotionalPopups() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [deletePopup, setDeletePopup] = useState<Popup | null>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const [form, setForm] = useState({
    title: "",
    body: "",
    image_url: "",
    cta_text: "",
    cta_url: "",
    mobile_label: "Special Offer",
    target_pages: [] as string[],
    is_global: false,
    frequency_type: "once",
    frequency_value: 1,
    delay_seconds: 0,
    is_active: false,
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    fetchPopups();
  }, []);

  const fetchPopups = async () => {
    try {
      const res = await fetch("/api/admin/promotional-popups");
      const data = await res.json();
      if (data.popups) {
        setPopups(data.popups);
      }
    } catch (error) {
      console.error("Error fetching popups:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkConflicts = (targetPages: string[]) => {
    const editingId = editingPopup?.id;
    if (editingId) return null;
    const globalConflict = popups.find(
      (p) =>
        p.is_active &&
        p.target_pages.includes("*") &&
        targetPages.includes("*")
    );
    if (globalConflict) {
      return `Active global popup "${globalConflict.title}" already exists`;
    }
    for (const page of targetPages) {
      if (page === "*") continue;
      const conflict = popups.find(
        (p) =>
          p.is_active &&
          p.id !== editingId &&
          p.target_pages.includes("*")
      );
      if (conflict) {
        return `Active global popup "${conflict.title}" will take precedence`;
      }
      const pageConflict = popups.find(
        (p) =>
          p.is_active &&
          p.id !== editingId &&
          p.target_pages.includes(page)
      );
      if (pageConflict) {
        return `Active popup for "${page}" already exists: "${pageConflict.title}"`;
      }
    }
    return null;
  };

  const handleOpenModal = (popup?: Popup) => {
    if (popup) {
      setEditingPopup(popup);
      setForm({
        title: popup.title,
        body: popup.body || "",
        image_url: popup.image_url || "",
        cta_text: popup.cta_text || "",
        cta_url: popup.cta_url || "",
        mobile_label: popup.mobile_label || "Special Offer",
        target_pages: popup.target_pages.filter((p) => p !== "*"),
        is_global: popup.target_pages.includes("*"),
        frequency_type: popup.frequency_type,
        frequency_value: popup.frequency_value,
        delay_seconds: popup.delay_seconds,
        is_active: popup.is_active,
        start_date: popup.start_date ? popup.start_date.slice(0, 16) : "",
        end_date: popup.end_date ? popup.end_date.slice(0, 16) : "",
      });
    } else {
      setEditingPopup(null);
      setForm({
        title: "",
        body: "",
        image_url: "",
        cta_text: "",
        cta_url: "",
        mobile_label: "Special Offer",
        target_pages: [],
        is_global: false,
        frequency_type: "once",
        frequency_value: 1,
        delay_seconds: 0,
        is_active: false,
        start_date: "",
        end_date: "",
      });
    }
    setConflictWarning(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPopup(null);
    setConflictWarning(null);
  };

  const handleTargetPagesChange = (page: string, checked: boolean) => {
    let newTargetPages: string[];
    if (page === "*") {
      newTargetPages = checked ? ["*"] : [];
    } else {
      newTargetPages = checked
        ? [...form.target_pages, page]
        : form.target_pages.filter((p) => p !== page);
    }
    setForm({ ...form, target_pages: newTargetPages });
    const warning = checkConflicts(newTargetPages);
    setConflictWarning(warning);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert("Title is required");
      return;
    }
    if (form.target_pages.length === 0 && !form.is_global) {
      alert("Please select at least one target page or choose global");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        body: form.body || null,
        image_url: form.image_url || null,
        cta_text: form.cta_text || null,
        cta_url: form.cta_url || null,
        mobile_label: form.mobile_label || "Special Offer",
        target_pages: form.is_global ? ["*"] : form.target_pages,
        frequency_type: form.frequency_type,
        frequency_value: form.frequency_value,
        delay_seconds: form.delay_seconds,
        is_active: form.is_active,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };

      const url = editingPopup
        ? `/api/admin/promotional-popups/${editingPopup.id}`
        : "/api/admin/promotional-popups";
      const method = editingPopup ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      await fetchPopups();
      handleCloseModal();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePopup) return;
    try {
      const res = await fetch(`/api/admin/promotional-popups/${deletePopup.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      await fetchPopups();
      setDeletePopup(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleToggleActive = async (popup: Popup) => {
    try {
      const res = await fetch(`/api/admin/promotional-popups/${popup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !popup.is_active }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      await fetchPopups();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredPopups = popups.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.target_pages.join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-nfw-dove py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold text-nfw-blackberry">
              Promotional Popups
            </h1>
            <p className="font-sans text-nfw-blackberry/60 mt-1">
              Create and manage promotional popups
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-nfw-aubergine text-white px-4 py-2 font-sans font-medium flex items-center gap-2 hover:bg-nfw-blackberry transition-colors"
          >
            <Plus size={18} />
            Create Popup
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nfw-blackberry/40" size={20} />
            <input
              type="text"
              placeholder="Search popups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-nfw-blackberry/20 font-sans focus:outline-none focus:border-nfw-aubergine"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-nfw-blackberry/60 font-sans">
            Loading...
          </div>
        ) : filteredPopups.length === 0 ? (
          <div className="text-center py-12 text-nfw-blackberry/60 font-sans">
            No popups found
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-nfw-blackberry/5">
                <tr>
                  <th className="text-left px-4 py-3 font-sans font-semibold text-nfw-blackberry/80 text-sm">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-sans font-semibold text-nfw-blackberry/80 text-sm">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 font-sans font-semibold text-nfw-blackberry/80 text-sm">
                    Target Pages
                  </th>
                  <th className="text-left px-4 py-3 font-sans font-semibold text-nfw-blackberry/80 text-sm">
                    Frequency
                  </th>
                  <th className="text-left px-4 py-3 font-sans font-semibold text-nfw-blackberry/80 text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nfw-blackberry/10">
                {filteredPopups.map((popup) => (
                  <tr key={popup.id} className="hover:bg-nfw-blackberry/5">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(popup)}
                        className={`px-2 py-1 text-xs font-sans font-medium rounded ${
                          popup.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {popup.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-sans text-nfw-blackberry">
                      {popup.title}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-nfw-blackberry/70">
                      {popup.target_pages.includes("*")
                        ? "Global"
                        : popup.target_pages.slice(0, 2).join(", ") +
                          (popup.target_pages.length > 2 ? ` +${popup.target_pages.length - 2}` : "")}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-nfw-blackberry/70">
                      {FREQUENCY_OPTIONS.find((f) => f.value === popup.frequency_type)?.label ||
                        popup.frequency_type}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(popup)}
                          className="p-1.5 text-nfw-aubergine hover:bg-nfw-aubergine/10 rounded"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeletePopup(popup)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-nfw-blackberry/10 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="font-serif text-xl font-bold text-nfw-blackberry">
                {editingPopup ? "Edit Popup" : "Create Popup"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-nfw-blackberry/10 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {conflictWarning && (
                <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 font-sans text-sm flex items-start gap-2">
                  <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                  <span>{conflictWarning}</span>
                </div>
              )}

              <div>
                <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans focus:outline-none focus:border-nfw-aubergine"
                  placeholder="Enter popup title"
                />
              </div>

              <div>
                <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-1">
                  Body
                </label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans focus:outline-none focus:border-nfw-aubergine resize-none"
                  placeholder="Enter popup body text"
                />
              </div>

              <div>
                <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-1">
                  Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="flex-1 px-3 py-2 border border-nfw-blackberry/20 font-sans focus:outline-none focus:border-nfw-aubergine"
                    placeholder="https://..."
                  />
                  <button
                    onClick={() => setShowMediaLibrary(true)}
                    className="px-3 py-2 bg-nfw-blackberry/10 text-nfw-blackberry font-sans text-sm hover:bg-nfw-blackberry/20 flex items-center gap-1"
                  >
                    <ImageIcon size={16} />
                    Browse
                  </button>
                </div>
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="mt-2 h-20 object-cover rounded"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-1">
                    CTA Text
                  </label>
                  <input
                    type="text"
                    value={form.cta_text}
                    onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans focus:outline-none focus:border-nfw-aubergine"
                    placeholder="Learn More"
                  />
                </div>
                <div>
                  <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-1">
                    CTA URL
                  </label>
                  <input
                    type="text"
                    value={form.cta_url}
                    onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans focus:outline-none focus:border-nfw-aubergine"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-1">
                    Mobile Label
                  </label>
                  <input
                    type="text"
                    value={form.mobile_label}
                    onChange={(e) => setForm({ ...form, mobile_label: e.target.value })}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans focus:outline-none focus:border-nfw-aubergine"
                    placeholder="Special Offer"
                  />
                </div>
              </div>

              <div>
                <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-2">
                  Target Pages *
                </label>
                <div className="flex items-center gap-4 mb-2">
                  <label className="flex items-center gap-2 font-sans text-sm">
                    <input
                      type="checkbox"
                      checked={form.is_global}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm({
                          ...form,
                          is_global: checked,
                          target_pages: checked ? [] : form.target_pages,
                        });
                        if (checked) setConflictWarning(null);
                      }}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">Global (All Pages)</span>
                  </label>
                </div>
                {!form.is_global && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    {AVAILABLE_PAGES.map((page) => (
                      <label
                        key={page.value}
                        className="flex items-center gap-2 font-sans text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.target_pages.includes(page.value)}
                          onChange={(e) =>
                            handleTargetPagesChange(page.value, e.target.checked)
                          }
                          className="w-4 h-4"
                        />
                        <span>{page.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-1">
                    Frequency
                  </label>
                  <select
                    value={form.frequency_type}
                    onChange={(e) =>
                      setForm({ ...form, frequency_type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans focus:outline-none focus:border-nfw-aubergine"
                  >
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-1">
                    Delay (seconds)
                  </label>
                  <input
                    type="number"
                    value={form.delay_seconds}
                    onChange={(e) =>
                      setForm({ ...form, delay_seconds: parseInt(e.target.value) || 0 })
                    }
                    min={0}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans focus:outline-none focus:border-nfw-aubergine"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-1">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans focus:outline-none focus:border-nfw-aubergine"
                  />
                </div>
                <div>
                  <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-1">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans focus:outline-none focus:border-nfw-aubergine"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 font-sans text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">Active</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-nfw-blackberry/10 flex justify-end gap-3 bg-nfw-blackberry/5">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 font-sans text-nfw-blackberry hover:bg-nfw-blackberry/10"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="px-4 py-2 font-sans text-nfw-blackberry border border-nfw-blackberry/20 hover:bg-nfw-blackberry/10"
              >
                Preview
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-nfw-aubergine text-white font-sans font-medium hover:bg-nfw-blackberry disabled:opacity-50"
              >
                {saving ? "Saving..." : editingPopup ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletePopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="font-serif text-lg font-bold text-nfw-blackberry mb-2">
              Delete Popup
            </h3>
            <p className="font-sans text-nfw-blackberry/70 mb-6">
              Are you sure you want to delete "{deletePopup.title}"? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletePopup(null)}
                className="px-4 py-2 font-sans text-nfw-blackberry hover:bg-nfw-blackberry/10"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white font-sans font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showMediaLibrary && (
        <MediaLibraryModal
          isOpen={showMediaLibrary}
          onClose={() => setShowMediaLibrary(false)}
          onSelect={(url) => {
            setForm({ ...form, image_url: url });
            setShowMediaLibrary(false);
          }}
          bucket="page-builder"
        />
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setPreviewMode("desktop")}
              className={`px-3 py-1.5 text-sm font-sans ${
                previewMode === "desktop"
                  ? "bg-nfw-aubergine text-white"
                  : "bg-white text-nfw-blackberry"
              }`}
            >
              Desktop
            </button>
            <button
              onClick={() => setPreviewMode("mobile")}
              className={`px-3 py-1.5 text-sm font-sans ${
                previewMode === "mobile"
                  ? "bg-nfw-aubergine text-white"
                  : "bg-white text-nfw-blackberry"
              }`}
            >
              Mobile
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="p-1.5 bg-white text-nfw-blackberry hover:bg-nfw-blackberry/10"
            >
              <X size={20} />
            </button>
          </div>

          <div className="text-white font-sans text-sm mb-4 text-center">
            Preview Mode - This is how the popup will appear to users
          </div>

          {previewMode === "desktop" ? (
            <div
              className={`bg-white rounded-lg shadow-2xl max-w-3xl w-full border-2 border-nfw-blackberry/20 animate-popup-fade`}
            >
              <div className="flex flex-col md:flex-row items-stretch">
                <div className="w-full md:w-1/2 flex-shrink-0 relative">
                  <div className="absolute inset-0 overflow-hidden rounded-t-lg md:rounded-l-lg md:rounded-r-none">
                    {form.image_url ? (
                      <img
                        src={form.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-nfw-blackberry/10" />
                    )}
                  </div>
                </div>
                <div className="w-full md:w-1/2 bg-white p-8 relative">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="absolute top-4 right-4 p-1 hover:bg-nfw-blackberry/10 rounded-full"
                  >
                    <X size={20} className="text-nfw-blackberry" />
                  </button>
                  <div className="pt-4 pb-8">
                    <h3 className="font-serif text-2xl md:text-3xl font-bold text-nfw-blackberry mb-4">
                      {form.title || "Popup Title"}
                    </h3>
                    {form.body && (
                      <p className="font-sans text-nfw-blackberry/80 text-base mb-6 whitespace-pre-wrap leading-relaxed">
                        {form.body}
                      </p>
                    )}
                    {form.cta_text && form.cta_url && (
                      <a
                        href={form.cta_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-nfw-citrine text-nfw-blackberry px-8 py-4 font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
                      >
                        {form.cta_text}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-[375px] animate-popup-fade">
              <div className="p-4 flex justify-between items-center border-b border-nfw-blackberry/10">
                <span className="font-sans text-sm text-nfw-blackberry/60">
                  {form.mobile_label || "Special Offer"}
                </span>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1 hover:bg-nfw-blackberry/10 rounded-full"
                >
                  <X size={20} className="text-nfw-blackberry" />
                </button>
              </div>
              <div className="p-6">
                <h3 className="font-serif text-xl font-bold text-nfw-blackberry mb-2">
                  {form.title || "Popup Title"}
                </h3>
                {form.body && (
                  <p className="font-sans text-nfw-blackberry/80 text-sm mb-4 whitespace-pre-wrap">
                    {form.body}
                  </p>
                )}
                {form.cta_text && form.cta_url && (
                  <a
                    href={form.cta_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-nfw-citrine text-nfw-blackberry px-6 py-2 font-ui font-medium text-sm hover:bg-nfw-citrine/80 transition-colors"
                  >
                    {form.cta_text}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
