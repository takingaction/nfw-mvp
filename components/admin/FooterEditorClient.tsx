"use client";

import { useState } from "react";
import { Plus, Trash2, Save, Upload } from "lucide-react";
import Link from "next/link";
import { uploadImage } from "@/lib/upload";

interface FooterLink {
  label: string;
  url: string;
}
interface FooterColumn {
  heading: string;
  links: FooterLink[];
}
interface SocialLink {
  platform: string;
  url: string;
  icon_url: string;
}
interface FooterData {
  id: string;
  logo_url: string | null;
  tagline: string | null;
  columns: FooterColumn[];
  social_links: SocialLink[];
  legal_links: FooterLink[];
  copyright: string | null;
}

export default function FooterEditorClient({
  initialData,
}: {
  initialData: FooterData | null;
}) {
  const [logoUrl, setLogoUrl] = useState(initialData?.logo_url ?? "");
  const [tagline, setTagline] = useState(initialData?.tagline ?? "");
  const [columns, setColumns] = useState<FooterColumn[]>(
    initialData?.columns ?? [],
  );
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    initialData?.social_links ?? [],
  );
  const [legalLinks, setLegalLinks] = useState<FooterLink[]>(
    initialData?.legal_links ?? [],
  );
  const [copyright, setCopyright] = useState(initialData?.copyright ?? "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/footer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          singleton: true,
          logo_url: logoUrl,
          tagline,
          columns,
          social_links: socialLinks,
          legal_links: legalLinks,
          copyright,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");
      showToast("Footer saved");
    } catch (err) {
      showToast("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const addColumn = () => setColumns([...columns, { heading: "", links: [] }]);

  const updateColumnHeading = (i: number, val: string) =>
    setColumns(
      columns.map((c, idx) => (idx === i ? { ...c, heading: val } : c)),
    );

  const removeColumn = (i: number) =>
    setColumns(columns.filter((_, idx) => idx !== i));

  const addColumnLink = (colIndex: number) =>
    setColumns(
      columns.map((c, i) =>
        i === colIndex
          ? { ...c, links: [...c.links, { label: "", url: "" }] }
          : c,
      ),
    );

  const updateColumnLink = (
    colIndex: number,
    linkIndex: number,
    key: keyof FooterLink,
    val: string,
  ) =>
    setColumns(
      columns.map((c, i) =>
        i === colIndex
          ? {
              ...c,
              links: c.links.map((l, j) =>
                j === linkIndex ? { ...l, [key]: val } : l,
              ),
            }
          : c,
      ),
    );

  const removeColumnLink = (colIndex: number, linkIndex: number) =>
    setColumns(
      columns.map((c, i) =>
        i === colIndex
          ? { ...c, links: c.links.filter((_, j) => j !== linkIndex) }
          : c,
      ),
    );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-[#2d1239] text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}

      {/* Header with Save Button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-[#2d1239]">Footer Editor</h1>
          <p className="text-gray-500 text-sm">
            Manage your site-wide footer content
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#2d1239] text-white rounded-full font-black text-sm uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Logo + tagline */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-black text-[#2d1239]">Logo & Tagline</h2>
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
            Logo
          </label>
          {logoUrl && (
            <div className="relative mb-3 group inline-block">
              <img src={logoUrl} alt="" className="h-12 object-contain" />
              <button
                onClick={() => setLogoUrl("")}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          )}
          <label className="block cursor-pointer mb-2">
            <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg hover:border-[#2d1239] hover:bg-[#2d1239]/5 transition-colors">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {logoUrl ? "Replace logo" : "Upload logo"}
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  // ✅ Updated to call without supabase param
                  const url = await uploadImage(file, "logos");
                  setLogoUrl(url);
                } catch (err) {
                  alert("Upload failed: " + (err as Error).message);
                }
              }}
            />
          </label>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
            Tagline
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
          />
        </div>
      </div>

      {/* Link columns */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-[#2d1239]">Link Columns</h2>
          <button
            onClick={addColumn}
            className="text-xs font-black uppercase tracking-wider text-[#2d1239] hover:opacity-70 transition-opacity flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Column
          </button>
        </div>
        <div className="space-y-6">
          {columns.map((col, colIndex) => (
            <div
              key={colIndex}
              className="border border-gray-100 rounded-xl p-4 bg-gray-50/50"
            >
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  value={col.heading}
                  onChange={(e) =>
                    updateColumnHeading(colIndex, e.target.value)
                  }
                  placeholder="Column heading"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-[#2d1239]"
                />
                <button
                  onClick={() => removeColumn(colIndex)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {col.links.map((link, linkIndex) => (
                  <div
                    key={linkIndex}
                    className="grid grid-cols-[1fr_1fr_auto] gap-2"
                  >
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) =>
                        updateColumnLink(
                          colIndex,
                          linkIndex,
                          "label",
                          e.target.value,
                        )
                      }
                      placeholder="Label"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) =>
                        updateColumnLink(
                          colIndex,
                          linkIndex,
                          "url",
                          e.target.value,
                        )
                      }
                      placeholder="URL"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
                    />
                    <button
                      onClick={() => removeColumnLink(colIndex, linkIndex)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addColumnLink(colIndex)}
                  className="mt-2 text-xs font-semibold text-gray-400 hover:text-[#2d1239] transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Link
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
          Copyright Text
        </label>
        <input
          type="text"
          value={copyright}
          onChange={(e) => setCopyright(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
        />
      </div>
    </div>
  );
}
