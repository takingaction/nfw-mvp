"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface NewPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (pageId: string) => void;
}

export default function NewPageModal({ isOpen, onClose, onCreated }: NewPageModalProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSlug = (t: string) => {
    return t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value));
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !slug.trim()) {
      setError("Title and slug are required");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("Slug can only contain lowercase letters, numbers, and hyphens");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/pages/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create page");
        return;
      }

      setTitle("");
      setSlug("");
      onCreated(data.id);
      onClose();
    } catch (err) {
      setError("Failed to create page");
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-nfw-blackberry">Create New Page</h3>
          <button
            onClick={onClose}
            className="p-1 text-nfw-blackberry/40 hover:text-nfw-blackberry transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. About Us"
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              URL Slug
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-nfw-blackberry/50">/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="about-us"
                className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
              />
            </div>
            <p className="text-xs text-nfw-blackberry/40 mt-1">
              The URL path for this page
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-semibold text-nfw-blackberry bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !title.trim() || !slug.trim()}
            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-nfw-blackberry rounded-lg hover:bg-nfw-blackberry/90 disabled:opacity-50 transition-colors"
          >
            {creating ? "Creating..." : "Create Page"}
          </button>
        </div>
      </div>
    </div>
  );
}
