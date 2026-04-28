"use client";

import { useState } from "react";
import { Save } from "lucide-react";

interface LegalPage {
  slug: string;
  title: string;
  termly_embed_code: string | null;
}

export default function LegalAdminClient({ pages }: { pages: LegalPage[] }) {
  const [activeTab, setActiveTab] = useState(pages[0]?.slug ?? "");
  const [embedCodes, setEmbedCodes] = useState<Record<string, string>>(
    pages.reduce((acc, p) => ({ ...acc, [p.slug]: p.termly_embed_code ?? "" }), {})
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/legal/${activeTab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termly_embed_code: embedCodes[activeTab] }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      showToast("Saved successfully!");
    } catch (err: any) {
      showToast(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const currentPage = pages.find(p => p.slug === activeTab);

  return (
    <div className="bg-white rounded-xl border border-nfw-blackberry/10 shadow-sm overflow-hidden">
      <div className="border-b border-nfw-blackberry/10">
        <nav className="flex">
          {pages.map((page) => (
            <button
              key={page.slug}
              onClick={() => setActiveTab(page.slug)}
              className={`px-6 py-4 font-ui text-sm font-medium transition-colors ${
                activeTab === page.slug
                  ? "bg-nfw-aubergine text-white"
                  : "text-nfw-blackberry/60 hover:text-nfw-blackberry hover:bg-nfw-blackberry/5"
              }`}
            >
              {page.title}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-nfw-blackberry mb-2 font-serif">
            {currentPage?.title}
          </h2>
          <p className="text-sm text-nfw-blackberry/60">
            Paste the Termly embed code below. This will be displayed on the{" "}
            <code className="bg-nfw-blackberry/5 px-1 py-0.5 rounded">/{currentPage?.slug}</code>{" "}
            page.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-nfw-blackberry mb-2">
            Termly Embed Code
          </label>
          <textarea
            value={embedCodes[activeTab] ?? ""}
            onChange={(e) => setEmbedCodes(prev => ({ ...prev, [activeTab]: e.target.value }))}
            placeholder={'<div name="termly-embed" data-id="..."></div>\n<script type="text/javascript">...</script>'}
            className="w-full h-64 px-4 py-3 border border-nfw-blackberry/20 font-mono text-sm text-nfw-blackberry focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent resize-none"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-nfw-aubergine text-white font-ui text-sm font-black uppercase tracking-[0.06em] hover:bg-nfw-aubergine/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
          {toast && (
            <span className="text-sm text-nfw-blackberry/60">{toast}</span>
          )}
        </div>
      </div>
    </div>
  );
}