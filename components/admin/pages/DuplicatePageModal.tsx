"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface DuplicatePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  page: {
    id: string;
    title: string;
    slug: string;
  };
  onDuplicated: (pageId: string, slug: string) => void;
}

export default function DuplicatePageModal({
  isOpen,
  onClose,
  page,
  onDuplicated,
}: DuplicatePageModalProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && page) {
      setTitle(`Copy of ${page.title}`);
      setSlug(`${page.slug}-copy`);
      setError(null);
    }
  }, [isOpen, page]);

  const generateSlug = (t: string) => {
    return t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    // Only auto-generate slug if it still has the -copy suffix from original
    if (slug === `${page.slug}-copy` || !slug) {
      setSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
  };

  const handleDuplicate = async () => {
    if (!title.trim() || !slug.trim()) {
      setError("Title and slug are required");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("Slug can only contain lowercase letters, numbers, and hyphens");
      return;
    }

    setDuplicating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/pages/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalPageId: page.id,
          title: title.trim(),
          slug: slug.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to duplicate page");
        return;
      }

      onDuplicated(data.id, data.slug);
      onClose();
    } catch {
      setError("Failed to duplicate page");
    } finally {
      setDuplicating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-nfw-blackberry">
            Duplicate Page
          </h3>
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
                onChange={(e) => handleSlugChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
              />
            </div>
            <p className="text-xs text-nfw-blackberry/40 mt-1">
              The URL path for this page
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-semibold text-nfw-blackberry bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDuplicate}
            disabled={duplicating || !title.trim() || !slug.trim()}
            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-nfw-blackberry rounded-lg hover:bg-nfw-blackberry/90 disabled:opacity-50 transition-colors"
          >
            {duplicating ? "Duplicating..." : "Duplicate Page"}
          </button>
        </div>
      </div>
    </div>
  );
}
