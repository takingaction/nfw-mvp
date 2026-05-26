"use client";

import { useState } from "react";
import type { EmailSection, EmailBlockType, EmailTemplateExtended } from "@/lib/email-blocks/types";
import { EMAIL_BLOCK_REGISTRY } from "@/lib/email-blocks/registry";
import { EmailSectionList } from "./EmailSectionList";
import MediaLibraryModal from "../MediaLibraryModal";

interface Props {
  template: EmailTemplateExtended;
  initialSections: EmailSection[];
  onSave: (sections: EmailSection[]) => Promise<void>;
  onPublish: () => Promise<{ success: boolean; error?: string }>;
  onPreview: () => Promise<string>;
  onSendTest?: (email: string) => Promise<{ success: boolean; message: string }>;
  onHeroImageSave?: (heroImageUrl: string) => Promise<void>;
}

export function EmailBuilder({
  template,
  initialSections,
  onSave,
  onPublish,
  onPreview,
  onSendTest,
  onHeroImageSave,
}: Props) {
  const [sections, setSections] = useState<EmailSection[]>(initialSections);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState(template.hero_image_url || "");
  const [showHeroImageModal, setShowHeroImageModal] = useState(false);
  const [isSavingHero, setIsSavingHero] = useState(false);

  const handleAddBlock = (type: EmailBlockType) => {
    const definition = EMAIL_BLOCK_REGISTRY[type];
    const newSection: EmailSection = {
      id: crypto.randomUUID(),
      email_template_id: template.id,
      section_type: type,
      order_index: sections.length,
      content: { ...definition.defaultContent },
      visible: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSections([...sections, newSection]);
    setShowAddMenu(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(sections);
      setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const html = await onPreview();
      setPreviewHtml(html);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const result = await onPublish();
      if (!result.success) {
        alert(result.error || "Failed to publish");
      } else {
        alert("Published successfully!");
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.includes("@") || !onSendTest) return;
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const result = await onSendTest(testEmail);
      setTestResult(result);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleHeroImageSave = async () => {
    if (!onHeroImageSave) return;
    setIsSavingHero(true);
    try {
      await onHeroImageSave(heroImageUrl);
      setLastSaved(new Date());
    } finally {
      setIsSavingHero(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Section List */}
      <div className="w-1/2 border-r border-nfw-blackberry/10 flex flex-col">
        <div className="p-5 border-b border-nfw-blackberry/10 bg-white">
          <div className="flex flex-col gap-4">
            {/* Row 1: Title + Primary Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-serif text-nfw-blackberry">{template.name}</h2>
                <p className="text-sm text-nfw-blackberry/50">
                  {template.status === "published" ? "Published" : "Draft"}
                  {lastSaved && ` - Last saved ${lastSaved.toLocaleTimeString()}`}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2.5 text-sm font-ui font-medium bg-nfw-wisteria text-white rounded hover:bg-nfw-wisteria/90 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  onClick={handlePreview}
                  disabled={isPreviewing}
                  className="px-5 py-2.5 text-sm font-ui font-medium bg-nfw-blackberry/10 text-nfw-blackberry rounded hover:bg-nfw-blackberry/20 disabled:opacity-50"
                >
                  {isPreviewing ? "Generating..." : "Preview"}
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="px-5 py-2.5 text-sm font-ui font-medium bg-nfw-citrine text-nfw-blackberry rounded hover:bg-nfw-citrine/90 disabled:opacity-50"
                >
                  {isPublishing ? "Publishing..." : "Publish"}
                </button>
              </div>
            </div>

            {/* Row 2: Test Email */}
            {onSendTest && (
              <div className="flex items-center gap-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter test email address"
                  className="flex-1 max-w-xs px-4 py-2.5 border border-nfw-blackberry/20 rounded text-sm"
                />
                <button
                  onClick={handleSendTest}
                  disabled={isSendingTest || !testEmail.includes("@")}
                  className="px-5 py-2.5 text-sm font-ui font-medium bg-nfw-lilac text-white rounded hover:bg-nfw-lilac/90 disabled:opacity-50 whitespace-nowrap"
                >
                  {isSendingTest ? "Sending..." : "Send Test"}
                </button>
              </div>
            )}

            {/* Row 3: Test Result */}
            {testResult && (
              <div className={`px-4 py-3 text-sm rounded ${testResult.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {testResult.message}
              </div>
            )}

            {/* Row 4: Hero Image */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-nfw-blackberry/70 whitespace-nowrap">
                Hero Image:
              </label>
              <input
                type="text"
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                placeholder="https://nationalfundforwomen.org/images/..."
                className="flex-1 px-3 py-2 border border-nfw-blackberry/20 rounded text-sm"
              />
              <button
                onClick={() => setShowHeroImageModal(true)}
                className="px-3 py-2 bg-nfw-lilac text-white text-sm font-medium rounded hover:bg-nfw-lilac/90 whitespace-nowrap"
              >
                Browse
              </button>
              <button
                onClick={handleHeroImageSave}
                disabled={isSavingHero || heroImageUrl === template.hero_image_url}
                className="px-3 py-2 bg-nfw-blackberry text-white text-sm font-medium rounded hover:bg-nfw-blackberry/90 disabled:opacity-50 whitespace-nowrap"
              >
                {isSavingHero ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {/* Add Section Button */}
          <div className="relative mt-4">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="w-full px-4 py-2.5 text-sm font-ui font-medium border-2 border-dashed border-nfw-wisteria/30 text-nfw-wisteria rounded hover:bg-nfw-wisteria/10"
            >
              + Add Section
            </button>

            {showAddMenu && (
              <div className="absolute z-50 mt-2 w-64 bg-white border border-nfw-blackberry/20 rounded shadow-lg max-h-80 overflow-y-auto">
                <div className="py-1">
                  {Object.entries(EMAIL_BLOCK_REGISTRY).map(([type, def]) => (
                    <button
                      key={type}
                      onClick={() => handleAddBlock(type as EmailBlockType)}
                      className="w-full px-4 py-2 text-left hover:bg-nfw-citrine/20"
                    >
                      <div className="text-sm font-medium text-nfw-blackberry">{def.label}</div>
                      <div className="text-xs text-nfw-blackberry/50">{def.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section List */}
        <div className="flex-1 overflow-y-auto p-4 bg-nfw-blackberry/5">
          <EmailSectionList sections={sections} onChange={setSections} />
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="w-1/2 flex flex-col bg-gray-100">
        <div className="p-3 border-b border-nfw-blackberry/10 bg-white">
          <h3 className="text-sm font-medium text-nfw-blackberry">Preview</h3>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {previewHtml ? (
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full min-h-[600px] border border-nfw-blackberry/20 rounded bg-white"
              title="Email Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-nfw-blackberry/40">
              Click "Preview" to see email
            </div>
          )}
        </div>
      </div>

      {/* Media Library Modal for Hero Image */}
      {showHeroImageModal && (
        <MediaLibraryModal
          isOpen={showHeroImageModal}
          onClose={() => setShowHeroImageModal(false)}
          onSelect={(imageUrl) => {
            setHeroImageUrl(imageUrl);
            setShowHeroImageModal(false);
          }}
          bucket="page-builder"
        />
      )}
    </div>
  );
}