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
    meta_schema?: string | null;
    include_in_sitemap?: boolean;
  };
  onSaved: () => void;
}

export default function EditPageModal({ isOpen, onClose, page, onSaved }: EditPageModalProps) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [metaTitle, setMetaTitle] = useState(page.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(page.meta_description || "");
  const [metaSchema, setMetaSchema] = useState(page.meta_schema || "");
  const [includeInSitemap, setIncludeInSitemap] = useState(page.include_in_sitemap ?? true);
  const [seoExpanded, setSeoExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const MAX_TITLE = 60;
  const MAX_DESCRIPTION = 160;
  const MAX_SCHEMA = 5000;

  const validateSchema = (schema: string): boolean => {
    if (!schema.trim()) return true;
    try {
      JSON.parse(schema);
      setSchemaError(null);
      return true;
    } catch {
      setSchemaError("Invalid JSON. Please check your schema markup.");
      return false;
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      setError("Title and slug are required");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("Slug can only contain lowercase letters, numbers, and hyphens");
      return;
    }

    if (!validateSchema(metaSchema)) {
      setError("Please fix the schema markup errors before saving.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, string | null | boolean> = {
        id: page.id,
        title: title.trim(),
        slug: slug.trim(),
      };

      if (metaTitle.trim()) {
        body.meta_title = metaTitle.trim();
      }

      if (metaDescription.trim()) {
        body.meta_description = metaDescription.trim();
      }

      if (metaSchema.trim()) {
        body.meta_schema = metaSchema.trim();
      }

      body.include_in_sitemap = includeInSitemap;

      const res = await fetch("/api/admin/pages/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Failed to update page");
        return;
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error("Catch error:", err);
      setError(`Failed to update page: ${err instanceof Error ? err.message : String(err)}`);
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
            <div className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                id="includeInSitemap"
                checked={includeInSitemap}
                onChange={(e) => setIncludeInSitemap(e.target.checked)}
                className="w-4 h-4 rounded border-nfw-blackberry/20 text-nfw-blackberry focus:ring-nfw-blackberry/20"
              />
              <label htmlFor="includeInSitemap" className="text-sm text-nfw-blackberry/70 cursor-pointer">
                Include in sitemap
              </label>
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50">
                      Schema Markup
                    </label>
                    <span className={`text-xs ${metaSchema.length > MAX_SCHEMA ? "text-red-500" : "text-nfw-blackberry/40"}`}>
                      {metaSchema.length}/{MAX_SCHEMA}
                    </span>
                  </div>
                  <textarea
                    value={metaSchema}
                    onChange={(e) => {
                      setMetaSchema(e.target.value);
                      if (e.target.value.trim()) {
                        validateSchema(e.target.value);
                      } else {
                        setSchemaError(null);
                      }
                    }}
                    maxLength={MAX_SCHEMA + 100}
                    rows={4}
                    placeholder={'{"@context": "https://schema.org", "@type": "Organization", ...}'}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm font-mono focus:outline-none focus:border-nfw-blackberry resize-none"
                  />
                  {schemaError && (
                    <p className="text-xs text-red-500 mt-1">{schemaError}</p>
                  )}
                  <p className="text-xs text-nfw-blackberry/40 mt-1">Paste JSON-LD schema markup for search engines</p>
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
