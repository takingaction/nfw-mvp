"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Eye, RotateCcw, Globe, ChevronLeft, Plus } from "lucide-react";
import Link from "next/link";
import { PageSection } from "@/lib/sections/types";
import SectionCard from "./SectionCard";
import SectionEditorPanel from "./SectionEditorPanel";
import TemplatePicker from "./TemplatePicker";
import { createClient } from "@/lib/supabase/client";
import {
  saveDraftSections,
  deleteDraftSection,
  publishPage,
  revertPage,
  unpublishPage,
  toggleSectionVisibility,
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
}

export default function SectionCanvas({ page, initialSections }: Props) {
  const [sections, setSections] = useState<PageSection[]>(initialSections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const selectedSection = sections.find((s) => s.id === selectedId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({
        ...s,
        order_index: i,
      }));

      setSections(reordered);

      try {
        await saveDraftSections(
          page.id,
          reordered.map((s) => ({
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
        showToast("Section saved");
      } catch {
        showToast("Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [selectedId, sections, page.id],
  );

  const handleDelete = useCallback(
    async (sectionId: string) => {
      if (!confirm("Delete this section?")) return;
      try {
        await deleteDraftSection(sectionId);
        setSections((prev) => prev.filter((s) => s.id !== sectionId));
        if (selectedId === sectionId) setSelectedId(null);
        showToast("Section deleted");
      } catch {
        showToast("Failed to delete");
      }
    },
    [selectedId],
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

  const handleAddSection = useCallback(
    async (template: {
      section_type: string;
      default_content: Record<string, unknown>;
    }) => {
      const supabase = createClient();
      const newOrderIndex = sections.length;

      const { data, error } = await supabase
        .from("page_sections")
        .insert({
          page_id: page.id,
          section_type: template.section_type,
          version: "draft",
          order_index: newOrderIndex,
          content: template.default_content,
          visible: true,
        })
        .select()
        .single();

      if (error) {
        showToast("Failed to add section");
        return;
      }

      setSections((prev) => [...prev, data]);
      setShowTemplatePicker(false);
      setSelectedId(data.id);
      showToast("Section added");
    },
    [sections.length, page.id],
  );

  const handlePublish = async () => {
    if (!confirm("Publish this page? This will make all draft changes live."))
      return;
    setPublishing(true);
    try {
      await publishPage(page.id, page.slug);
      showToast("Page published successfully");
    } catch {
      showToast("Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const handleRevert = async () => {
    if (
      !confirm(
        "Revert to last published version? All draft changes will be lost.",
      )
    )
      return;
    try {
      await revertPage(page.id);
      showToast("Reverted to published version");
      window.location.reload();
    } catch {
      showToast("Failed to revert");
    }
  };

  const handleUnpublish = async () => {
    if (
      !confirm("Unpublish this page? It will no longer be visible to visitors.")
    )
      return;
    try {
      await unpublishPage(page.id, page.slug);
      showToast("Page unpublished");
    } catch {
      showToast("Failed to unpublish");
    }
  };

  const statusColor: Record<string, string> = {
    published: "bg-[#d4f1ad] text-[#2d1239]",
    draft: "bg-[#fdf493] text-[#2d1239]",
    unpublished: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left — canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/pages"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#2d1239] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Pages
            </Link>
            <div className="w-px h-4 bg-gray-200" />
            <h1 className="font-black text-[#2d1239]">{page.title}</h1>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                statusColor[page.status] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {page.status}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/preview/${page.preview_token}/${page.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#2d1239] bg-[#2d1239]/5 rounded-lg hover:bg-[#2d1239]/10 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Link>

            {page.status === "published" && (
              <button
                onClick={handleRevert}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Revert
              </button>
            )}

            {page.status === "published" && (
              <button
                onClick={handleUnpublish}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Unpublish
              </button>
            )}

            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#2d1239] rounded-lg hover:bg-[#2d1239]/90 disabled:opacity-50 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {publishing ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>

        {/* Section list */}
        <div className="flex-1 overflow-y-auto p-8">
          {mounted && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="max-w-2xl mx-auto space-y-3">
                  {sections.map((section) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      isSelected={selectedId === section.id}
                      onSelect={() =>
                        setSelectedId(
                          selectedId === section.id ? null : section.id,
                        )
                      }
                      onDelete={() => handleDelete(section.id)}
                      onToggleVisibility={() =>
                        handleToggleVisibility(section.id)
                      }
                    />
                  ))}

                  {sections.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                      <p className="text-lg font-semibold mb-2">
                        No sections yet
                      </p>
                      <p className="text-sm">Add sections to build this page</p>
                    </div>
                  )}

                  {/* Add section button */}
                  <button
                    onClick={() => setShowTemplatePicker(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-semibold text-gray-400 hover:border-[#2d1239] hover:text-[#2d1239] transition-colors mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Section
                  </button>
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Right — editor panel */}
      {selectedSection && (
        <div className="w-[420px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <SectionEditorPanel
            key={selectedSection.id}
            section={selectedSection}
            onSave={handleSaveSection}
            onClose={() => setSelectedId(null)}
            saving={saving}
          />
        </div>
      )}

      {/* Template picker modal */}
      {showTemplatePicker && (
        <TemplatePicker
          onSelect={handleAddSection}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#2d1239] text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
