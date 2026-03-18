"use client";

import { useState } from "react";
import { Plus, Trash2, Save, Upload } from "lucide-react";
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
      const { error } = await supabase.from("site_footer").upsert({
        id: initialData?.id,
        singleton: true,
        logo_url: logoUrl,
        tagline,
        columns,
        social_links: socialLinks,
        legal_links: legalLinks,
        copyright,
      });
      if (error) throw error;
      showToast("Footer saved");
    } catch {
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
                  const url = await uploadImage(file, "logos");
                  setLogoUrl(url);
                } catch (err) {
                  alert("Upload failed: " + (err as Error).message);
                }
              }}
            />
          </label>
          <input
            type="text"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="Or paste a URL directly"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239] text-gray-400"
          />
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
        <h2 className="font-black text-[#2d1239] mb-4">Link Columns</h2>
        <div className="space-y-4">
          {columns.map((col, colIndex) => (
            <div
              key={colIndex}
              className="border border-gray-200 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
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
              <div className="space-y-2 mb-3">
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
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => addColumnLink(colIndex)}
                className="flex items-center gap-1 text-xs font-semibold text-[#2d1239] hover:opacity-70 transition-opacity"
              >
                <Plus className="w-3 h-3" /> Add Link
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addColumn}
          className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#2d1239] hover:opacity-70 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Column
        </button>
      </div>

      {/* Social links */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-black text-[#2d1239] mb-4">Social Links</h2>
        <div className="space-y-2 mb-4">
          {socialLinks.map((link, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <input
                type="text"
                value={link.platform}
                onChange={(e) =>
                  setSocialLinks(
                    socialLinks.map((l, j) =>
                      j === i ? { ...l, platform: e.target.value } : l,
                    ),
                  )
                }
                placeholder="Platform"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
              />
              <input
                type="text"
                value={link.url}
                onChange={(e) =>
                  setSocialLinks(
                    socialLinks.map((l, j) =>
                      j === i ? { ...l, url: e.target.value } : l,
                    ),
                  )
                }
                placeholder="URL"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
              />
              <input
                type="text"
                value={link.icon_url}
                onChange={(e) =>
                  setSocialLinks(
                    socialLinks.map((l, j) =>
                      j === i ? { ...l, icon_url: e.target.value } : l,
                    ),
                  )
                }
                placeholder="Icon URL"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
              />
              <button
                onClick={() =>
                  setSocialLinks(socialLinks.filter((_, j) => j !== i))
                }
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            setSocialLinks([
              ...socialLinks,
              { platform: "", url: "", icon_url: "" },
            ])
          }
          className="flex items-center gap-2 text-sm font-semibold text-[#2d1239] hover:opacity-70 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Social Link
        </button>
      </div>

      {/* Legal links */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-black text-[#2d1239] mb-4">Legal Links</h2>
        <div className="space-y-2 mb-4">
          {legalLinks.map((link, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                type="text"
                value={link.label}
                onChange={(e) =>
                  setLegalLinks(
                    legalLinks.map((l, j) =>
                      j === i ? { ...l, label: e.target.value } : l,
                    ),
                  )
                }
                placeholder="Label"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
              />
              <input
                type="text"
                value={link.url}
                onChange={(e) =>
                  setLegalLinks(
                    legalLinks.map((l, j) =>
                      j === i ? { ...l, url: e.target.value } : l,
                    ),
                  )
                }
                placeholder="URL"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
              />
              <button
                onClick={() =>
                  setLegalLinks(legalLinks.filter((_, j) => j !== i))
                }
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setLegalLinks([...legalLinks, { label: "", url: "" }])}
          className="flex items-center gap-2 text-sm font-semibold text-[#2d1239] hover:opacity-70 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Legal Link
        </button>
      </div>

      {/* Copyright */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-black text-[#2d1239] mb-4">Copyright</h2>
        <input
          type="text"
          value={copyright}
          onChange={(e) => setCopyright(e.target.value)}
          placeholder="© 2026 National Fund for Women. All rights reserved."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#2d1239] text-white rounded-xl font-bold hover:bg-[#2d1239]/90 disabled:opacity-50 transition-colors"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Footer"}
      </button>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#2d1239] text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
