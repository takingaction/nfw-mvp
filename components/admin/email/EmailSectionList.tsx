"use client";

import { useState, useCallback } from "react";
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { GripVertical, Trash2, Eye, EyeOff } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { EmailSection, EmailBlockType } from "@/lib/email-blocks/types";
import { EMAIL_BLOCK_REGISTRY } from "@/lib/email-blocks/registry";
import { EmailBlockEditor } from "./EmailBlockEditor";

interface Props {
  sections: EmailSection[];
  onChange: (sections: EmailSection[]) => void;
}

function SortableSection({
  section,
  isEditing,
  onToggleEdit,
  onDelete,
  onToggleVisible,
  onContentChange,
  onBackgroundColorChange,
}: {
  section: EmailSection;
  isEditing: boolean;
  onToggleEdit: () => void;
  onDelete: () => void;
  onToggleVisible: () => void;
  onContentChange: (content: Record<string, unknown>) => void;
  onBackgroundColorChange: (background_color: string | undefined) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const definition = EMAIL_BLOCK_REGISTRY[section.section_type as EmailBlockType];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg overflow-hidden ${isDragging ? "shadow-lg" : ""} ${!section.visible ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-nfw-blackberry/10">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 text-nfw-blackberry/40 hover:text-nfw-blackberry cursor-grab"
          suppressHydrationWarning
        >
          <GripVertical size={16} />
        </button>

        <span className="flex-1 text-sm font-medium text-nfw-blackberry">
          {definition?.label || section.section_type}
        </span>

        <button
          type="button"
          onClick={onToggleVisible}
          className="p-1 text-nfw-blackberry/40 hover:text-nfw-aubergine"
          title={section.visible ? "Hide" : "Show"}
        >
          {section.visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>

        <button
          type="button"
          onClick={onToggleEdit}
          className={`px-2 py-1 text-xs font-medium rounded ${
            isEditing ? "bg-nfw-aubergine text-white" : "bg-nfw-blackberry/10 text-nfw-blackberry"
          }`}
        >
          {isEditing ? "Done" : "Edit"}
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-nfw-blackberry/40 hover:text-red-600"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {isEditing && (
        <div className="p-4 bg-nfw-citrine/10 border-t border-nfw-blackberry/10">
          <div className="mb-4">
            <label className="block text-sm font-medium text-nfw-blackberry mb-1">
              Background
            </label>
            <select
              value={section.background_color || "none"}
              onChange={(e) => onBackgroundColorChange(e.target.value === "none" ? undefined : e.target.value)}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm text-nfw-blackberry focus:outline-none focus:border-nfw-aubergine"
            >
              <option value="none">None</option>
              <option value="dove">Dove</option>
              <option value="aubergine">Aubergine</option>
              <option value="wisteria">Wisteria</option>
              <option value="lilac">Lilac</option>
              <option value="blackberry">Blackberry</option>
            </select>
          </div>
          <EmailBlockEditor
            blockType={section.section_type as EmailBlockType}
            content={section.content}
            onChange={onContentChange}
          />
        </div>
      )}
    </div>
  );
}

export function EmailSectionList({ sections, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({
        ...s,
        order_index: i,
      }));

      onChange(reordered);
    },
    [sections, onChange]
  );

  const handleContentChange = (id: string, content: Record<string, unknown>) => {
    onChange(sections.map((s) => (s.id === id ? { ...s, content } : s)));
  };

  const handleBackgroundColorChange = (id: string, background_color: string | undefined) => {
    onChange(sections.map((s) => (s.id === id ? { ...s, background_color: background_color as typeof s.background_color } : s)));
  };

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((section) => (
            <SortableSection
              key={section.id}
              section={section}
              isEditing={editingId === section.id}
              onToggleEdit={() => setEditingId(editingId === section.id ? null : section.id)}
              onDelete={() => onChange(sections.filter((s) => s.id !== section.id))}
              onToggleVisible={() =>
                onChange(sections.map((s) => (s.id === section.id ? { ...s, visible: !s.visible } : s)))
              }
              onContentChange={(content) => handleContentChange(section.id, content)}
              onBackgroundColorChange={(bg) => handleBackgroundColorChange(section.id, bg)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {sections.length === 0 && (
        <div className="text-center py-8 text-nfw-blackberry/50">
          No sections yet. Add one from the palette below.
        </div>
      )}
    </div>
  );
}