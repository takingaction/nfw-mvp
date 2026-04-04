"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";

interface EditPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  page: {
    id: string;
    title: string;
    slug: string;
    meta_title?: string | null;
    meta_description?: string | null;
  };
  onSaved: () => void;
}

export default function EditPageModal({ isOpen, onClose, page, onSaved }: EditPageModalProps) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [metaTitle, setMetaTitle] = useState(page.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(page.meta_description || "");
  const [seoExpanded, setSeoExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_TITLE = 60;
  const MAX_DESCRIPTION = 160;

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      setError("Title and slug are required");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("Slug can only contain lowercase letters, numbers, and hyphens");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const updateData: Record<string, string> = {
        title: title.trim(),
        slug: slug.trim(),
      };

      // Only include SEO fields if they have content
      if (metaTitle?.trim()) {
        updateData.meta_title = metaTitle.trim();
      }

      if (metaDescription?.trim()) {
        updateData.meta_description = metaDescription.trim();
      }

      console.log("Updating page:", page.id, "with:", updateData);

      const { error: updateError } = await supabaseAdmin
        .from("pages")
        .update(updateData)
        .eq("id", page.id);

      if (updateError) {
        console.error("Update error:", updateError);
        if (updateError.message.includes("slug")) {
          setError("A page with this slug already exists");
        } else {
          setError(`Failed to update page: ${updateError.message}`);
        }
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Failed to update page");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-nfw-blackberry">Edit Page</h3>
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
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
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
                className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
              />
            </div>
          </div>

          {/* SEO Settings - Collapsible */}
          <div className="border border-nfw-blackberry/10 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setSeoExpanded(!seoExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-semibold text-nfw-blackberry">SEO Settings</span>
              {seoExpanded ? (
                <ChevronUp className="w-4 h-4 text-nfw-blackberry/50" />
              ) : (
                <ChevronDown className="w-4 h-4 text-nfw-blackberry/50" />
              )}
            </button>

            {seoExpanded && (
              <div className="px-4 py-4 space-y-4 border-t border-nfw-blackberry/10">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50">
                      SEO Title
                    </label>
                    <span className={`text-xs ${metaTitle.length > MAX_TITLE ? "text-red-500" : "text-nfw-blackberry/40"}`}>
                      {metaTitle.length}/{MAX_TITLE}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    maxLength={MAX_TITLE + 20}
                    placeholder={title || "Page title will be used if empty"}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
                  />
                  {metaTitle.length > MAX_TITLE && (
                    <p className="text-xs text-red-500 mt-1">Recommended: 60 characters or less</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50">
                      SEO Description
                    </label>
                    <span className={`text-xs ${metaDescription.length > MAX_DESCRIPTION ? "text-red-500" : "text-nfw-blackberry/40"}`}>
                      {metaDescription.length}/{MAX_DESCRIPTION}
                    </span>
                  </div>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    maxLength={MAX_DESCRIPTION + 40}
                    rows={3}
                    placeholder="Brief description for search results..."
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry resize-none"
                  />
                  {metaDescription.length > MAX_DESCRIPTION && (
                    <p className="text-xs text-red-500 mt-1">Recommended: 160 characters or less</p>
                  )}
                </div>
              </div>
            )}
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
            onClick={handleSave}
            disabled={saving || !title.trim() || !slug.trim()}
            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-nfw-blackberry rounded-lg hover:bg-nfw-blackberry/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
