"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Trash2, ChevronRight } from "lucide-react";
import { PageSection } from "@/lib/sections/types";
import { SECTION_REGISTRY } from "@/lib/sections/registry";

interface Props {
  section: PageSection;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}

export default function SectionCard({
  section,
  isSelected,
  onSelect,
  onDelete,
  onToggleVisibility,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const def =
    SECTION_REGISTRY[section.section_type as keyof typeof SECTION_REGISTRY];
  const label = def?.label ?? section.section_type;

  // Get a content preview from the first text field
  const content = section.content as Record<string, unknown>;
  const preview =
    (content.headline as string) ||
    (content.quote_text as string) ||
    (content.heading as string) ||
    "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border-2 transition-all ${
        isSelected
          ? "border-[#2d1239] shadow-md"
          : "border-gray-200 hover:border-gray-300"
      } ${!section.visible ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Content */}
        <button onClick={onSelect} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-black uppercase tracking-wider text-[#2d1239]/50">
              {label}
            </span>
          </div>
          {preview && (
            <p className="text-sm text-gray-700 truncate">{preview}</p>
          )}
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleVisibility}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title={section.visible ? "Hide section" : "Show section"}
          >
            {section.visible ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete section"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <ChevronRight
            className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? "rotate-90" : ""}`}
          />
        </div>
      </div>
    </div>
  );
}
