"use client";

import { useState, useEffect } from "react";
import MediaLibraryModal from "./MediaLibraryModal";

type EmailTemplate = {
  id: string;
  name: string;
  slug: string;
  category: "resend" | "supabase";
  description: string | null;
  subject: string | null;
  html_content: string | null;
  hero_image_url: string | null;
  is_editable: boolean;
  source_file: string | null;
  updated_at: string;
};

type Props = {
  template: EmailTemplate;
  onClose: () => void;
  userEmail: string | undefined;
};

export default function EmailEditorModal({ template, onClose, userEmail }: Props) {
  const [subject, setSubject] = useState(template.subject || "");
  const [htmlContent, setHtmlContent] = useState(template.html_content || "");
  const [heroImageUrl, setHeroImageUrl] = useState(template.hero_image_url || "");
  const [heroImageModalOpen, setHeroImageModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"source" | "preview">("source");
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState(userEmail || "");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setResult(null);

    try {
      const res = await fetch(`/api/admin/emails/${template.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          html_content: htmlContent,
          hero_image_url: heroImageUrl || null
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: "Template saved successfully!" });
        setTimeout(onClose, 1500);
      } else {
        setResult({ success: false, message: data.error || "Failed to save" });
      }
    } catch {
      setResult({ success: false, message: "Failed to save template" });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.includes("@")) return;

    setSendingTest(true);
    setResult(null);

    try {
      const saveRes = await fetch(`/api/admin/emails/${template.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, html_content: htmlContent }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json();
        setResult({ success: false, message: data.error || "Failed to save before test" });
        return;
      }

      const res = await fetch(`/api/admin/emails/${template.slug}/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail, hero_image_url: heroImageUrl }),
      });

      const data = await res.json();
      setResult({
        success: res.ok,
        message: data.message || data.error || "Unknown response",
      });
    } catch {
      setResult({ success: false, message: "Failed to send test email" });
    } finally {
      setSendingTest(false);
    }
  };

  const handleCopyForSupabase = async () => {
    await navigator.clipboard.writeText(htmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-4xl h-[90vh] flex flex-col rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-nfw-blackberry font-serif">
              Edit: {template.name}
            </h2>
            {template.category === "supabase" && (
              <p className="text-sm text-nfw-lilac mt-1">
                Copy HTML and paste into Supabase Dashboard → Authentication → Email Templates
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-nfw-blackberry/50 hover:text-nfw-blackberry text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Subject Line */}
        <div className="px-4 py-3 border-b bg-nfw-dove/30">
          <label className="block text-xs font-medium text-nfw-blackberry/50 uppercase mb-1">
            Subject Line
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:border-nfw-blackberry focus:outline-none text-sm"
          />
        </div>

        {/* Hero Image URL - only for resend templates */}
        {template.category === "resend" && (
          <div className="px-4 py-3 border-b bg-nfw-dove/30">
            <label className="block text-xs font-medium text-nfw-blackberry/50 uppercase mb-1">
              Hero Image URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                placeholder="https://nationalfundforwomen.org/images/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-nfw-blackberry focus:outline-none text-sm"
              />
              <button
                onClick={() => setHeroImageModalOpen(true)}
                className="px-3 py-2 bg-nfw-lilac text-white text-sm font-medium rounded hover:bg-nfw-lilac/90 flex items-center gap-1"
              >
                Browse
              </button>
            </div>
            <p className="text-xs text-nfw-blackberry/40 mt-1">
              Leave blank to use the default hero image
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3">
          <button
            onClick={() => setActiveTab("source")}
            className={`px-4 py-2 font-medium text-sm rounded-t ${
              activeTab === "source"
                ? "bg-nfw-blackberry text-white"
                : "bg-nfw-dove text-nfw-blackberry hover:bg-nfw-dove/70"
            }`}
          >
            Source
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-2 font-medium text-sm rounded-t ${
              activeTab === "preview"
                ? "bg-nfw-blackberry text-white"
                : "bg-nfw-dove text-nfw-blackberry hover:bg-nfw-dove/70"
            }`}
          >
            Preview
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 pt-0">
          {activeTab === "source" ? (
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="flex-1 w-full p-4 border rounded-lg font-mono text-sm overflow-auto focus:outline-none focus:border-nfw-blackberry resize-none"
              style={{ minHeight: '300px', whiteSpace: 'pre-wrap' }}
            />
          ) : (
            <div className="h-full bg-gray-100 rounded-lg overflow-hidden">
              <PreviewFrame body={htmlContent} slug={template.slug} subject={subject} />
            </div>
          )}
        </div>

        {/* Test Email Row */}
        <div className="px-4 py-3 border-t bg-nfw-dove/30">
          <div className="flex items-center gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Test email address"
              className="flex-1 px-3 py-2 border rounded text-sm"
            />
            <button
              onClick={handleSendTest}
              disabled={sendingTest || !testEmail.includes("@")}
              className="px-4 py-2 bg-nfw-wisteria text-white text-sm font-medium rounded hover:bg-nfw-wisteria/90 disabled:bg-gray-300 disabled:text-gray-500"
            >
              {sendingTest ? "Sending..." : "Save & Send Test"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t">
          {result && (
            <div
              className={`px-4 py-2 text-sm rounded ${
                result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {result.message}
            </div>
          )}

          <div className="flex gap-3 ml-auto">
            {template.category === "supabase" && (
              <button
                onClick={handleCopyForSupabase}
                className="px-4 py-2 bg-nfw-lilac text-white text-sm font-medium rounded hover:bg-nfw-lilac/90"
              >
                {copied ? "Copied!" : "Copy HTML for Supabase"}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-nfw-blackberry text-sm font-medium rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-nfw-blackberry text-white text-sm font-medium rounded hover:bg-nfw-blackberry/90 disabled:bg-gray-300"
            >
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>
      </div>

      {/* Media Library Modal for Hero Image */}
      {heroImageModalOpen && (
        <MediaLibraryModal
          isOpen={heroImageModalOpen}
          onClose={() => setHeroImageModalOpen(false)}
          onSelect={(imageUrl) => {
            setHeroImageUrl(imageUrl);
            setHeroImageModalOpen(false);
          }}
          bucket="page-builder"
        />
      )}
    </div>
  );
}

function PreviewFrame({ body, slug, subject }: { body: string; slug: string; subject: string }) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/emails/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, slug, subject }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.html) {
          setPreviewHtml(data.html);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [body, slug, subject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading preview...
      </div>
    );
  }

  if (!previewHtml) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No preview available
      </div>
    );
  }

  return (
    <iframe
      srcDoc={previewHtml}
      className="w-full h-full"
      title="Email Preview"
    />
  );
}