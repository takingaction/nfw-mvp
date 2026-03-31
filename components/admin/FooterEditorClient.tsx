"use client";

import { useState } from "react";
import { Plus, Trash2, Save, Upload } from "lucide-react";
import { uploadImage } from "@/lib/upload";

interface FooterLink {
  label: string;
  url: string;
}

interface FooterData {
  id: string;
  logo_url: string | null;
  column1_heading: string;
  column1_links: FooterLink[];
  column2_heading: string;
  column2_links: FooterLink[];
  column3_heading: string;
  column3_links: FooterLink[];
  copyright_text: string;
  footer_link1_text: string;
  footer_link1_url: string;
  footer_link2_text: string;
  footer_link2_url: string;
  footer_link3_text: string;
  footer_link3_url: string;
}

const defaultLinks: FooterLink[] = [
  { label: "Become a Member", url: "/auth/sign-up" },
  { label: "Perks & Discounts", url: "/perks/info" },
  { label: "Microgrants", url: "/grants" },
  { label: "Zero Dollar Store", url: "/store" },
];

export default function FooterEditorClient({
  initialData,
}: {
  initialData: FooterData | null;
}) {
  const [logoUrl, setLogoUrl] = useState(initialData?.logo_url ?? "/images/footer-logo.png");
  const [column1Heading, setColumn1Heading] = useState(initialData?.column1_heading ?? "MEMBERSHIP");
  const [column1Links, setColumn1Links] = useState<FooterLink[]>(
    initialData?.column1_links ?? defaultLinks
  );
  const [column2Heading, setColumn2Heading] = useState(initialData?.column2_heading ?? "COMMUNITY");
  const [column2Links, setColumn2Links] = useState<FooterLink[]>(
    initialData?.column2_links ?? defaultLinks
  );
  const [column3Heading, setColumn3Heading] = useState(initialData?.column3_heading ?? "ORGANIZATION");
  const [column3Links, setColumn3Links] = useState<FooterLink[]>(
    initialData?.column3_links ?? defaultLinks
  );
  const [copyrightText, setCopyrightText] = useState(
    initialData?.copyright_text ?? "© 2026 National Fund for Women. All rights reserved."
  );
  const [footerLink1Text, setFooterLink1Text] = useState(initialData?.footer_link1_text ?? "Privacy Policy");
  const [footerLink1Url, setFooterLink1Url] = useState(initialData?.footer_link1_url ?? "/privacy");
  const [footerLink2Text, setFooterLink2Text] = useState(initialData?.footer_link2_text ?? "Terms of Use");
  const [footerLink2Url, setFooterLink2Url] = useState(initialData?.footer_link2_url ?? "/terms");
  const [footerLink3Text, setFooterLink3Text] = useState(initialData?.footer_link3_text ?? "Accessibility");
  const [footerLink3Url, setFooterLink3Url] = useState(initialData?.footer_link3_url ?? "/accessibility");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const updateLink = (
    setter: React.Dispatch<React.SetStateAction<FooterLink[]>>,
    index: number,
    key: keyof FooterLink,
    value: string
  ) => {
    setter((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [key]: value } : l))
    );
  };

  const removeLink = (
    setter: React.Dispatch<React.SetStateAction<FooterLink[]>>,
    index: number
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const addLink = (
    setter: React.Dispatch<React.SetStateAction<FooterLink[]>>
  ) => {
    setter((prev) => [...prev, { label: "", url: "" }]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/footer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          logo_url: logoUrl,
          column1_heading: column1Heading,
          column1_links: column1Links,
          column2_heading: column2Heading,
          column2_links: column2Links,
          column3_heading: column3Heading,
          column3_links: column3Links,
          copyright_text: copyrightText,
          footer_link1_text: footerLink1Text,
          footer_link1_url: footerLink1Url,
          footer_link2_text: footerLink2Text,
          footer_link2_url: footerLink2Url,
          footer_link3_text: footerLink3Text,
          footer_link3_url: footerLink3Url,
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

  const renderLinkEditor = (
    label: string,
    links: FooterLink[],
    setter: React.Dispatch<React.SetStateAction<FooterLink[]>>
  ) => (
    <div className="border border-nfw-blackberry/5 p-4 bg-nfw-dove/50">
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={label}
          onChange={(e) => {
            if (setter === setColumn1Links) setColumn1Heading(e.target.value);
            else if (setter === setColumn2Links) setColumn2Heading(e.target.value);
            else setColumn3Heading(e.target.value);
          }}
          placeholder="Column heading"
          className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm font-semibold focus:outline-none focus:border-nfw-blackberry font-ui"
        />
      </div>
      <div className="space-y-2">
        {links.map((link, linkIndex) => (
          <div key={linkIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input
              type="text"
              value={link.label}
              onChange={(e) => updateLink(setter, linkIndex, "label", e.target.value)}
              placeholder="Label"
              className="px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
            />
            <input
              type="text"
              value={link.url}
              onChange={(e) => updateLink(setter, linkIndex, "url", e.target.value)}
              placeholder="URL"
              className="px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
            />
            <button
              onClick={() => removeLink(setter, linkIndex)}
              className="p-1.5 text-nfw-blackberry/30 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => addLink(setter)}
          className="mt-2 text-xs font-semibold text-nfw-blackberry/40 hover:text-nfw-blackberry transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add Link
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-nfw-blackberry text-white px-6 py-3 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}

      {/* Header with Save Button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-nfw-blackberry font-serif">Footer Editor</h1>
          <p className="text-nfw-blackberry/50 text-sm">
            Manage footer columns, links, and copyright
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-nfw-blackberry text-white font-black text-sm uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Logo */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <h2 className="font-black text-nfw-blackberry font-ui mb-4">Logo</h2>
        {logoUrl && (
          <div className="relative mb-3 group inline-block">
            <img src={logoUrl} alt="" className="h-16 object-contain" />
            <button
              onClick={() => setLogoUrl("")}
              className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        )}
        <label className="block cursor-pointer mb-2">
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-nfw-blackberry/20 hover:border-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors">
            <Upload className="w-4 h-4 text-nfw-blackberry/40" />
            <span className="text-sm text-nfw-blackberry/50">
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
          className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry text-nfw-blackberry/40"
        />
      </div>

      {/* Link Columns */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <h2 className="font-black text-nfw-blackberry font-ui mb-4">Link Columns</h2>
        <div className="space-y-6">
          {renderLinkEditor("Column 1", column1Links, setColumn1Links)}
          {renderLinkEditor("Column 2", column2Links, setColumn2Links)}
          {renderLinkEditor("Column 3", column3Links, setColumn3Links)}
        </div>
      </div>

      {/* Copyright */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <h2 className="font-black text-nfw-blackberry font-ui mb-4">Copyright</h2>
        <input
          type="text"
          value={copyrightText}
          onChange={(e) => setCopyrightText(e.target.value)}
          className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
        />
      </div>

      {/* Footer Links (below line) */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <h2 className="font-black text-nfw-blackberry font-ui mb-4">Footer Links</h2>
        <p className="text-xs text-nfw-blackberry/50 mb-4">These links appear horizontally on the right side below the divider line.</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
                Link 1 Text
              </label>
              <input
                type="text"
                value={footerLink1Text}
                onChange={(e) => setFooterLink1Text(e.target.value)}
                className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
                Link 1 URL
              </label>
              <input
                type="text"
                value={footerLink1Url}
                onChange={(e) => setFooterLink1Url(e.target.value)}
                className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
                Link 2 Text
              </label>
              <input
                type="text"
                value={footerLink2Text}
                onChange={(e) => setFooterLink2Text(e.target.value)}
                className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
                Link 2 URL
              </label>
              <input
                type="text"
                value={footerLink2Url}
                onChange={(e) => setFooterLink2Url(e.target.value)}
                className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
                Link 3 Text
              </label>
              <input
                type="text"
                value={footerLink3Text}
                onChange={(e) => setFooterLink3Text(e.target.value)}
                className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
                Link 3 URL
              </label>
              <input
                type="text"
                value={footerLink3Url}
                onChange={(e) => setFooterLink3Url(e.target.value)}
                className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
