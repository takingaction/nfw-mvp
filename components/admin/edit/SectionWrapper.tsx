"use client";

import { useState } from "react";
import { PageSection } from "@/lib/sections/types";
import SectionRenderer from "@/components/sections/SectionRenderer";
import FloatingControls from "./FloatingControls";

interface Props {
  section: PageSection;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onReorder: (sectionId: string, direction: "up" | "down") => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}

export default function SectionWrapper({
  section,
  isFirst,
  isLast,
  onEdit,
  onReorder,
  onToggleVisibility,
  onDelete,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hidden overlay */}
      {!section.visible && section.visible !== undefined && (
        <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center">
          <button
            onClick={onToggleVisibility}
            className="flex items-center gap-2 px-4 py-2 bg-white text-nfw-blackberry font-semibold"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Show Section
          </button>
        </div>
      )}

      {/* Section content */}
      <div className={`relative ${!section.visible && section.visible !== undefined ? "opacity-30 pointer-events-none" : ""}`}>
        <SectionRenderer sections={[section]} />
      </div>

      {/* Floating controls - show if visible is true or undefined (treat undefined as visible) */}
      {(section.visible === undefined || section.visible) && (
        <FloatingControls
          isVisible={isHovered}
          isFirst={isFirst}
          isLast={isLast}
          onEdit={onEdit}
          onMoveUp={() => onReorder(section.id, "up")}
          onMoveDown={() => onReorder(section.id, "down")}
          onToggleVisibility={onToggleVisibility}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
