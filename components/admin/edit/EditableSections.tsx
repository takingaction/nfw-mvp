"use client";

import { useState, useCallback } from "react";
import { PageSection } from "@/lib/sections/types";
import type { SectionTemplate } from "@/types/section-templates";
import SectionRenderer from "@/components/sections/SectionRenderer";
import SectionEditorPanel from "@/components/admin/pages/SectionEditorPanel";
import TemplatePicker from "@/components/admin/pages/TemplatePicker";
import ConfirmModal from "@/components/admin/ConfirmModal";
import StickyEditBar from "./StickyEditBar";
import SectionWrapper from "./SectionWrapper";
import {
  saveDraftSections,
  deleteDraftSection,
  publishPage,
  revertPage,
  unpublishPage,
  toggleSectionVisibility,
  addSectionFromTemplate,
} from "@/app/admin/pages/[pageId]/actions";

interface Page {
  id: string;
  slug: string;
  title: string;
  status: string;
  preview_token: string;
}

interface Props {
  page: Page;
  initialSections: PageSection[];
  templates: SectionTemplate[];
}

export default function EditableSections({ page, initialSections, templates }: Props) {
  const [sections, setSections] = useState<PageSection[]>(initialSections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "danger" | "default";
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const selectedSection = sections.find((s) => s.id === selectedId) ?? null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveSection = useCallback(
    async (content: Record<string, unknown>) => {
      if (!selectedId) return;
      setSaving(true);
      try {
        const updated = sections.map((s) =>
          s.id === selectedId ? { ...s, content } : s,
        );
        setSections(updated);
        await saveDraftSections(
          page.id,
          updated.map((s) => ({
            id: s.id,
            section_type: s.section_type,
            order_index: s.order_index,
            content: s.content as Record<string, unknown>,
            visible: s.visible,
          })),
        );
      } catch {
        showToast("Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [selectedId, sections, page.id],
  );

  const handleReorder = useCallback(
    async (sectionId: string, direction: "up" | "down") => {
      const index = sections.findIndex((s) => s.id === sectionId);
      if (index === -1) return;
      
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sections.length) return;

      const reordered = [...sections];
      [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
      const updated = reordered.map((s, i) => ({ ...s, order_index: i }));
      
      setSections(updated);
      try {
        await saveDraftSections(
          page.id,
          updated.map((s) => ({
            id: s.id,
            section_type: s.section_type,
            order_index: s.order_index,
            content: s.content as Record<string, unknown>,
            visible: s.visible,
          })),
        );
        showToast("Order saved");
      } catch {
        showToast("Failed to save order");
      }
    },
    [sections, page.id],
  );

  const handleToggleVisibility = useCallback(
    async (sectionId: string) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return;
      const newVisible = !section.visible;
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, visible: newVisible } : s,
        ),
      );
      try {
        await toggleSectionVisibility(sectionId, newVisible);
      } catch {
        showToast("Failed to update visibility");
      }
    },
    [sections],
  );

  const handleDelete = useCallback(
    async (sectionId: string) => {
      setConfirmModal({
        isOpen: true,
        title: "Delete Section",
        message: "Are you sure you want to delete this section?",
        confirmLabel: "Delete",
        variant: "danger",
        onConfirm: async () => {
          try {
            await deleteDraftSection(sectionId);
            setSections((prev) => prev.filter((s) => s.id !== sectionId));
            if (selectedId === sectionId) setSelectedId(null);
            showToast("Section deleted");
          } catch {
            showToast("Failed to delete");
          }
        },
      });
    },
    [selectedId],
  );

  const handleAddSection = useCallback(
    async (template: { section_type: string; default_content: Record<string, unknown> }) => {
      const newOrderIndex = sections.length;
      try {
        const data = await addSectionFromTemplate(
          page.id,
          template.section_type,
          template.default_content,
          newOrderIndex,
        );
        setSections((prev) => [...prev, data]);
        setShowTemplatePicker(false);
        setSelectedId(data.id);
        showToast("Section added");
      } catch {
        showToast("Failed to add section");
      }
    },
    [sections.length, page.id],
  );

  const handlePublish = () => {
    setConfirmModal({
      isOpen: true,
      title: "Publish Page",
      message: "Publish this page? This will make all draft changes live.",
      confirmLabel: "Publish",
      onConfirm: async () => {
        setPublishing(true);
        try {
          await publishPage(page.id, page.slug);
          showToast("Page published successfully");
        } catch {
          showToast("Failed to publish");
        } finally {
          setPublishing(false);
        }
      },
    });
  };

  const handleRevert = () => {
    setConfirmModal({
      isOpen: true,
      title: "Revert Page",
      message: "Revert to last published version? All draft changes will be lost.",
      confirmLabel: "Revert",
      variant: "danger",
      onConfirm: async () => {
        try {
          await revertPage(page.id);
          showToast("Reverted to published version");
          window.location.reload();
        } catch {
          showToast("Failed to revert");
        }
      },
    });
  };

  const handleUnpublish = () => {
    setConfirmModal({
      isOpen: true,
      title: "Unpublish Page",
      message: "Unpublish this page? It will no longer be visible to visitors.",
      confirmLabel: "Unpublish",
      variant: "danger",
      onConfirm: async () => {
        try {
          await unpublishPage(page.id, page.slug);
          showToast("Page unpublished");
        } catch {
          showToast("Failed to unpublish");
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sticky top bar */}
      <StickyEditBar
        page={page}
        onPublish={handlePublish}
        onRevert={handleRevert}
        onUnpublish={handleUnpublish}
        publishing={publishing}
      />

      {/* Main content */}
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="space-y-6">
          {sections.map((section, index) => (
            <SectionWrapper
              key={section.id}
              section={section}
              isFirst={index === 0}
              isLast={index === sections.length - 1}
              onEdit={() => setSelectedId(section.id)}
              onReorder={handleReorder}
              onToggleVisibility={() => handleToggleVisibility(section.id)}
              onDelete={() => handleDelete(section.id)}
            />
          ))}

          {sections.length === 0 && (
            <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-lg font-semibold mb-2 text-gray-600">No sections yet</p>
              <p className="text-sm text-gray-400 mb-4">Add sections to build this page</p>
            </div>
          )}

          {/* Add section button */}
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 text-gray-500 hover:border-nfw-blackberry hover:text-nfw-blackberry transition-colors rounded-lg"
          >
            <span className="text-lg">+</span>
            <span className="font-semibold">Add Section</span>
          </button>
        </div>
      </div>

      {/* Editor panel */}
      {selectedSection && (
        <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-xl z-50 flex flex-col overflow-hidden">
          <SectionEditorPanel
            key={selectedSection.id}
            section={selectedSection}
            onSave={handleSaveSection}
            onClose={() => setSelectedId(null)}
            saving={saving}
          />
        </div>
      )}

      {/* Template picker */}
      {showTemplatePicker && (
        <TemplatePicker
          templates={templates}
          onSelect={handleAddSection}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {/* Confirm modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-nfw-blackberry text-white px-6 py-3 text-sm font-semibold shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
