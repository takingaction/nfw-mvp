"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

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
  is_active?: boolean;
  source_file: string | null;
  updated_at: string;
  status?: "draft" | "published";
  full_email_html?: string | null;
};

type Props = {
  initialTemplates: EmailTemplate[];
  userEmail: string | undefined;
};

export default function AdminEmailsClient({ initialTemplates, userEmail }: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [activeCategory, setActiveCategory] = useState<"resend" | "supabase">("resend");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState(userEmail || "");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);
  const [togglingTemplate, setTogglingTemplate] = useState<string | null>(null);
  const supabase = createClient();

  const resendTemplates = templates.filter((t) => t.category === "resend");
  const supabaseTemplates = templates.filter((t) => t.category === "supabase");
  const displayedTemplates = activeCategory === "resend" ? resendTemplates : supabaseTemplates;

  // Fetch preview HTML when selected template changes
  useEffect(() => {
    // Supabase templates are handled differently - show html_content in iframe
    if (selectedTemplate?.category === "supabase") {
      setPreviewHtml(null);
      return;
    }

    // For resend templates, preview API handles both html_content and full_email_html
    if (!selectedTemplate?.html_content && !selectedTemplate?.full_email_html) {
      setPreviewHtml(null);
      return;
    }

    setLoadingPreview(true);
    fetch("/api/admin/emails/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: selectedTemplate.html_content,
        name: "Preview User",
        subject: selectedTemplate.subject,
        slug: selectedTemplate.slug,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.html) {
          setPreviewHtml(data.html);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch preview:", err);
      })
      .finally(() => {
        setLoadingPreview(false);
      });
  }, [selectedTemplate]);

  const handleSendTest = async () => {
    if (!selectedTemplate || !testEmail.includes("@")) return;

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch(`/api/admin/emails/${selectedTemplate.slug}/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail }),
      });

      const data = await res.json();
      setTestResult({
        success: res.ok,
        message: data.message || data.error || "Unknown response",
      });
    } catch (error) {
      setTestResult({ success: false, message: "Failed to send test email" });
    } finally {
      setSendingTest(false);
    }
  };

  const copyHtmlToClipboard = () => {
    if (selectedTemplate?.html_content) {
      navigator.clipboard.writeText(selectedTemplate.html_content);
      setTestResult({ success: true, message: "HTML copied to clipboard!" });
    }
  };

  const handleSeedTemplates = async () => {
    setSeeding(true);
    setSeedResult(null);

    try {
      const res = await fetch("/api/admin/emails/seed", {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        setSeedResult({ success: true, message: `Seeded ${data.results?.filter((r: any) => r.success).length || 0} templates successfully!` });
        // Refresh templates list
        const { data: updatedTemplates } = await supabase
          .from("email_templates")
          .select("*")
          .order("category", { ascending: false })
          .order("name", { ascending: true });
        if (updatedTemplates) {
          setTemplates(updatedTemplates);
        }
      } else {
        setSeedResult({ success: false, message: data.error || "Failed to seed templates" });
      }
    } catch (error) {
      setSeedResult({ success: false, message: "Failed to seed templates" });
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    if (!template.is_editable || template.category !== "resend") return;

    setTogglingTemplate(template.slug);

    try {
      const res = await fetch(`/api/admin/emails/${template.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !template.is_active }),
      });

      if (res.ok) {
        const { template: updated } = await res.json();
        // Update in templates list
        setTemplates((prev) =>
          prev.map((t) => (t.slug === template.slug ? { ...t, is_active: updated.is_active } : t))
        );
        // Update selected template if it's the one being toggled
        if (selectedTemplate?.slug === template.slug) {
          setSelectedTemplate({ ...selectedTemplate, is_active: updated.is_active });
        }
      }
    } catch (error) {
      console.error("Failed to toggle template:", error);
    } finally {
      setTogglingTemplate(null);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-nfw-blackberry font-serif">
          Email Templates
        </h1>
        <p className="text-nfw-blackberry/60 mt-2">
          Preview and manage all email templates
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1">
          <button
            onClick={() => {
              setActiveCategory("resend");
              setSelectedTemplate(resendTemplates[0] || null);
              setTestResult(null);
            }}
            className={`px-6 py-3 font-medium ${
              activeCategory === "resend"
                ? "bg-nfw-blackberry text-white"
                : "bg-white text-nfw-blackberry hover:bg-nfw-dove"
            }`}
          >
            Resend Emails ({resendTemplates.length})
          </button>
          <button
            onClick={() => {
              setActiveCategory("supabase");
              setSelectedTemplate(supabaseTemplates[0] || null);
              setTestResult(null);
            }}
            className={`px-6 py-3 font-medium ${
              activeCategory === "supabase"
                ? "bg-nfw-blackberry text-white"
                : "bg-white text-nfw-blackberry hover:bg-nfw-dove"
            }`}
          >
            Supabase Emails ({supabaseTemplates.length})
          </button>
        </div>
        {/* Seed Templates button - temporarily hidden until needed */}
        {/*
        <div className="flex items-center gap-3">
          {seedResult && (
            <span className={`text-sm ${seedResult.success ? "text-green-600" : "text-red-600"}`}>
              {seedResult.message}
            </span>
          )}
          <button
            onClick={handleSeedTemplates}
            disabled={seeding}
            className="px-4 py-2 bg-nfw-wisteria text-white text-sm font-medium hover:bg-nfw-wisteria/90 disabled:opacity-50"
          >
            {seeding ? "Seeding..." : "Seed Templates"}
          </button>
        </div>
        */}
      </div>

      {/* Main Content */}
      <div className="flex gap-6 h-[calc(100vh-280px)]">
        {/* Left Panel - Template List */}
        <div className="w-80 bg-white border overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-nfw-dove">
            <h2 className="font-medium text-nfw-blackberry">
              {activeCategory === "resend" ? "Resend Templates" : "Supabase Templates"}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {displayedTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  setSelectedTemplate(template);
                  setTestResult(null);
                }}
                className={`w-full p-4 text-left border-b hover:bg-nfw-dove/50 ${
                  selectedTemplate?.id === template.id ? "bg-nfw-dove" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-nfw-blackberry">{template.name}</span>
                  {template.category === "resend" && (
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        template.is_active !== false
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {template.is_active !== false ? "ACTIVE" : "INACTIVE"}
                    </span>
                  )}
                </div>
                <div className="text-sm text-nfw-blackberry/50 mt-1">
                  {template.source_file || template.slug}
                </div>
              </button>
            ))}
            {displayedTemplates.length === 0 && (
              <div className="p-4 text-nfw-blackberry/50 text-center">
                No templates found
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview & Actions */}
        <div className="flex-1 flex flex-col bg-white border overflow-hidden">
          {selectedTemplate ? (
            <>
              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="p-4 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-nfw-blackberry font-serif">
                      {selectedTemplate.name}
                    </h2>
                    {selectedTemplate.description && (
                      <p className="text-nfw-blackberry/60 mt-1">
                        {selectedTemplate.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <span
                      className={`px-3 py-1 text-xs font-medium ${
                        selectedTemplate.category === "resend"
                          ? "bg-nfw-wisteria text-white"
                          : "bg-nfw-lilac text-white"
                      }`}
                    >
                      {selectedTemplate.category.toUpperCase()}
                    </span>
                    {selectedTemplate.status === "published" && (
                      <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800">
                        PUBLISHED
                      </span>
                    )}
                    {selectedTemplate.status === "draft" && (
                      <span className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-800">
                        DRAFT
                      </span>
                    )}
                    {selectedTemplate.is_editable && (
                      <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                        EDITABLE
                      </span>
                    )}
                    {selectedTemplate.category === "resend" && selectedTemplate.is_editable && (
                      <button
                        onClick={() => handleToggleActive(selectedTemplate)}
                        disabled={togglingTemplate === selectedTemplate.slug}
                        className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                          selectedTemplate.is_active !== false
                            ? "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                            : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                        } disabled:opacity-50`}
                      >
                        {togglingTemplate === selectedTemplate.slug
                          ? "..."
                          : selectedTemplate.is_active !== false
                          ? "Disable"
                          : "Enable"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Subject */}
                {selectedTemplate.subject && (
                  <div className="mt-4">
                    <label className="text-xs font-medium text-nfw-blackberry/50 uppercase">
                      Subject Line
                    </label>
                    <p className="text-nfw-blackberry mt-1">{selectedTemplate.subject}</p>
                  </div>
                )}

                {/* Source File */}
                {selectedTemplate.source_file && (
                  <div className="mt-4">
                    <label className="text-xs font-medium text-nfw-blackberry/50 uppercase">
                      Source File
                    </label>
                    <p className="text-nfw-blackberry/70 mt-1 font-mono text-sm">
                      {selectedTemplate.source_file}
                    </p>
                  </div>
                )}

                {/* Last Updated */}
                <div className="mt-4">
                  <label className="text-xs font-medium text-nfw-blackberry/50 uppercase">
                    Last Updated
                  </label>
                  <p className="text-nfw-blackberry/70 mt-1 text-sm">
                    {new Date(selectedTemplate.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-100 p-4 flex-shrink-0" style={{ height: '350px' }}>
                <div className="h-full bg-white shadow-lg overflow-auto rounded-lg">
                  {loadingPreview ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      Loading preview...
                    </div>
                  ) : selectedTemplate?.category === "supabase" ? (
                    selectedTemplate.html_content ? (
                      <iframe
                        srcDoc={selectedTemplate.html_content}
                        className="w-full h-full"
                        title="Email Preview"
                        sandbox={undefined}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        No preview available
                      </div>
                    )
                  ) : previewHtml ? (
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-full"
                      title="Email Preview"
                      sandbox={undefined}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      No preview available
                    </div>
                  )}
                </div>
              </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t bg-nfw-dove/30 flex-shrink-0">
                <div className="flex items-center gap-4">
{selectedTemplate.is_editable && (
                      <a
                        href={`/admin/emails/${selectedTemplate.slug}/builder`}
                        className="bg-nfw-aubergine text-white px-6 py-2 font-medium hover:bg-nfw-aubergine/90"
                      >
                        Edit with Builder
                      </a>
                    )}

                  {selectedTemplate.category === "supabase" && (
                    <button
                      onClick={copyHtmlToClipboard}
                      className="bg-nfw-lilac text-white px-6 py-2 font-medium hover:bg-nfw-lilac/90"
                    >
                      Copy HTML for Supabase
                    </button>
                  )}

                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Test email address"
                      className="flex-1 px-4 py-2 border"
                    />
                    <button
                      onClick={handleSendTest}
                      disabled={
                        sendingTest ||
                        !testEmail.includes("@")
                      }
                      className="px-4 py-2 font-medium bg-nfw-wisteria text-white hover:bg-nfw-wisteria/90 disabled:bg-gray-200 disabled:text-gray-400"
                    >
                      {sendingTest ? "Sending..." : "Send Test"}
                    </button>
                  </div>
                </div>

                {selectedTemplate.category === "supabase" && (
                  <div className="mt-3 text-sm text-nfw-blackberry/60">
                    <strong>Supabase workflow:</strong> Edit the template above, then click "Copy HTML for Supabase" and paste into Supabase Dashboard → Authentication → Email Templates.
                    <a
                      href="https://supabase.com/dashboard/project/lirsaxhujjgnibcwyzpl/auth/templates"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-nfw-wisteria hover:underline"
                    >
                      Open Supabase Email Templates →
                    </a>
                  </div>
                )}

                {testResult && (
                  <div
                    className={`mt-3 px-4 py-2 text-sm ${
                      testResult.success
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {testResult.message}
                  </div>
                )}

                
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a template to preview
            </div>
          )}
        </div>
      </div>

      
    </>
  );
}