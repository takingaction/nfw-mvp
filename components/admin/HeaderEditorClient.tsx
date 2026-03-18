"use client";

import { useState } from "react";
import { Plus, Trash2, Save, Upload } from "lucide-react";
import { uploadImage } from "@/lib/upload";

interface NavLink {
  label: string;
  url: string;
  highlight: boolean;
}

interface HeaderData {
  id: string;
  logo_url: string | null;
  nav_links: NavLink[];
  cta_label: string | null;
  cta_url: string | null;
}

export default function HeaderEditorClient({
  initialData,
}: {
  initialData: HeaderData | null;
}) {
  const [logoUrl, setLogoUrl] = useState(initialData?.logo_url ?? "");
  const [navLinks, setNavLinks] = useState<NavLink[]>(
    initialData?.nav_links ?? [],
  );
  const [ctaLabel, setCtaLabel] = useState(initialData?.cta_label ?? "");
  const [ctaUrl, setCtaUrl] = useState(initialData?.cta_url ?? "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const addLink = () => {
    setNavLinks([...navLinks, { label: "", url: "", highlight: false }]);
  };

  const updateLink = (
    index: number,
    key: keyof NavLink,
    value: string | boolean,
  ) => {
    setNavLinks(
      navLinks.map((l, i) => (i === index ? { ...l, [key]: value } : l)),
    );
  };

  const removeLink = (index: number) => {
    setNavLinks(navLinks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("site_header").upsert({
        id: initialData?.id,
        singleton: true,
        logo_url: logoUrl,
        nav_links: navLinks,
        cta_label: ctaLabel,
        cta_url: ctaUrl,
      });
      if (error) throw error;
      showToast("Header saved");
    } catch {
      showToast("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-black text-[#2d1239] mb-4">Logo</h2>

        {logoUrl && (
          <div className="relative mb-3 group inline-block">
            <img
              src={logoUrl}
              alt="Logo preview"
              className="h-12 object-contain"
            />
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

      {/* Nav links */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-black text-[#2d1239] mb-4">Navigation Links</h2>
        <div className="space-y-3 mb-4">
          {navLinks.map((link, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center"
            >
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLink(i, "label", e.target.value)}
                placeholder="Label"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
              />
              <input
                type="text"
                value={link.url}
                onChange={(e) => updateLink(i, "url", e.target.value)}
                placeholder="URL"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
              />
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={link.highlight}
                  onChange={(e) => updateLink(i, "highlight", e.target.checked)}
                  className="rounded"
                />
                CTA
              </label>
              <button
                onClick={() => removeLink(i)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addLink}
          className="flex items-center gap-2 text-sm font-semibold text-[#2d1239] hover:opacity-70 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Link
        </button>
      </div>

      {/* CTA button */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-black text-[#2d1239] mb-4">CTA Button</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
              Label
            </label>
            <input
              type="text"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="e.g. Join Today"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
              URL
            </label>
            <input
              type="text"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="/auth/sign-up"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239]"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#2d1239] text-white rounded-xl font-bold hover:bg-[#2d1239]/90 disabled:opacity-50 transition-colors"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Header"}
      </button>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#2d1239] text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
