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
  const content = (section.content ?? {}) as Record<string, unknown>;
  const preview =
    (content.headline as string) ||
    (content.quote_text as string) ||
    (content.heading as string) ||
    "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border-2 transition-all ${
        isSelected
          ? "border-nfw-blackberry"
          : "border-nfw-blackberry/10 hover:border-nfw-blackberry/20"
      } ${!section.visible ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-nfw-blackberry/20 hover:text-nfw-blackberry/40 cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Content */}
        <button onClick={onSelect} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-black uppercase tracking-wider text-nfw-blackberry/50">
              {label}
            </span>
          </div>
          {preview && (
            <p className="text-sm text-nfw-blackberry/70 truncate">{preview}</p>
          )}
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleVisibility}
            className="p-1.5 text-nfw-blackberry/40 hover:text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors"
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
            className="p-1.5 text-nfw-blackberry/40 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete section"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <ChevronRight
            className={`w-4 h-4 text-nfw-blackberry/40 transition-transform ${isSelected ? "rotate-90" : ""}`}
          />
        </div>
      </div>
    </div>
  );
}
