"use client";

import { useState, useEffect } from "react";
import EmailEditorModal from "./EmailEditorModal";

type EmailTemplate = {
  id: string;
  name: string;
  slug: string;
  category: "resend" | "supabase";
  description: string | null;
  subject: string | null;
  html_content: string | null;
  is_editable: boolean;
  source_file: string | null;
  updated_at: string;
};

type Props = {
  initialTemplates: EmailTemplate[];
  userEmail: string | undefined;
};

export default function AdminEmailsClient({ initialTemplates, userEmail }: Props) {
  const [templates] = useState(initialTemplates);
  const [activeCategory, setActiveCategory] = useState<"resend" | "supabase">("resend");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [testEmail, setTestEmail] = useState(userEmail || "");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const resendTemplates = templates.filter((t) => t.category === "resend");
  const supabaseTemplates = templates.filter((t) => t.category === "supabase");
  const displayedTemplates = activeCategory === "resend" ? resendTemplates : supabaseTemplates;

  // Fetch preview HTML when selected template changes
  useEffect(() => {
    if (!selectedTemplate?.html_content || selectedTemplate.category === "supabase") {
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
                <div className="font-medium text-nfw-blackberry">{template.name}</div>
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
                  <div className="flex gap-2">
                    <span
                      className={`px-3 py-1 text-xs font-medium ${
                        selectedTemplate.category === "resend"
                          ? "bg-nfw-wisteria text-white"
                          : "bg-nfw-lilac text-white"
                      }`}
                    >
                      {selectedTemplate.category.toUpperCase()}
                    </span>
                    {selectedTemplate.is_editable && (
                      <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800">
                        EDITABLE
                      </span>
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
                    <button
                      onClick={() => setShowEditor(true)}
                      className="bg-nfw-blackberry text-white px-6 py-2 font-medium hover:bg-nfw-blackberry/90"
                    >
                      Edit Template
                    </button>
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

      {/* Edit Modal */}
      {showEditor && selectedTemplate && (
        <EmailEditorModal
          template={selectedTemplate}
          onClose={() => setShowEditor(false)}
          userEmail={userEmail}
        />
      )}
    </>
  );
}